
-- 1. class_sessions: meeting point columns for custom trips
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS meeting_point_address text,
  ADD COLUMN IF NOT EXISTS meeting_point_lat double precision,
  ADD COLUMN IF NOT EXISTS meeting_point_lng double precision,
  ADD COLUMN IF NOT EXISTS meeting_point_place_id text;

-- 2. messages.offer_expires_at already exists; ensure index for cron sweep
CREATE INDEX IF NOT EXISTS idx_messages_offer_expires
  ON public.messages (offer_expires_at)
  WHERE attachment_type = 'custom_offer' AND offer_expires_at IS NOT NULL;

-- 3. Replace the host_availability sync trigger so it also writes a 'held' row
--    when a pending_offer booking is created, and releases it on decline/expire.
--    For custom-offer bookings the operator id is found via operators.owner_id = aide_id.
CREATE OR REPLACE FUNCTION public.sync_host_availability_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_operator_id uuid;
BEGIN
  IF NEW.trip_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve operator id: prefer the listing-based lookup (legacy trip_packages),
  -- otherwise fall back to the aide's operator profile (custom trips).
  IF NEW.course_id IS NOT NULL THEN
    SELECT operator_id INTO v_operator_id
    FROM public.trip_packages
    WHERE id = NEW.course_id
    LIMIT 1;
  END IF;
  IF v_operator_id IS NULL AND NEW.aide_id IS NOT NULL THEN
    SELECT id INTO v_operator_id
    FROM public.operators
    WHERE owner_id = NEW.aide_id
    LIMIT 1;
  END IF;

  IF v_operator_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.host_availability (host_id, date, status, booking_id)
      VALUES (v_operator_id, NEW.trip_date, 'booked', NEW.id)
      ON CONFLICT (host_id, date) DO UPDATE
        SET status = 'booked', booking_id = EXCLUDED.booking_id, updated_at = now();

    ELSIF NEW.status = 'pending_offer' OR NEW.status = 'pending_payment' THEN
      INSERT INTO public.host_availability (host_id, date, status, booking_id)
      VALUES (v_operator_id, NEW.trip_date, 'held', NEW.id)
      ON CONFLICT (host_id, date) DO UPDATE
        SET status = 'held', booking_id = EXCLUDED.booking_id, updated_at = now()
        WHERE public.host_availability.status NOT IN ('booked');

    ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('pending_offer','pending_payment','confirmed')
                          AND NEW.status NOT IN ('pending_offer','pending_payment','confirmed') THEN
      DELETE FROM public.host_availability
      WHERE booking_id = NEW.id
        AND status IN ('held','booked');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure unique (host_id, date) for upsert. Use a regular unique constraint if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='host_availability'
      AND indexname='host_availability_host_date_key'
  ) THEN
    BEGIN
      ALTER TABLE public.host_availability
        ADD CONSTRAINT host_availability_host_date_key UNIQUE (host_id, date);
    EXCEPTION WHEN duplicate_table THEN NULL;
             WHEN unique_violation THEN NULL;
             WHEN others THEN NULL;
    END;
  END IF;
END$$;

-- Wire trigger
DROP TRIGGER IF EXISTS trg_sync_host_availability ON public.bookings;
CREATE TRIGGER trg_sync_host_availability
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_host_availability_from_booking();

-- 4. Auto-expire custom-offer holds: any pending_offer booking whose offer
--    has elapsed gets declined, freeing its held availability via the trigger.
CREATE OR REPLACE FUNCTION public.expire_pending_custom_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  WITH expired AS (
    SELECT DISTINCT b.id
    FROM public.bookings b
    JOIN public.messages m
      ON m.booking_id = b.id
     AND m.attachment_type = 'custom_offer'
    WHERE b.status = 'pending_offer'
      AND m.offer_expires_at IS NOT NULL
      AND m.offer_expires_at < now()
  ),
  upd AS (
    UPDATE public.bookings
       SET status = 'declined'
     WHERE id IN (SELECT id FROM expired)
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM upd;
  RETURN affected;
END;
$$;

-- 5. Schedule it every minute via pg_cron.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-custom-offers') THEN
    PERFORM cron.unschedule('expire-pending-custom-offers');
  END IF;
  PERFORM cron.schedule(
    'expire-pending-custom-offers',
    '* * * * *',
    $cron$ SELECT public.expire_pending_custom_offers(); $cron$
  );
END$$;
