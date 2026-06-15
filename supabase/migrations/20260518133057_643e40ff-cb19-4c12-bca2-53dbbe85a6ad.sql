-- Snapshot + order_number columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS platform_fee_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aide_payout_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_time timestamptz,
  ADD COLUMN IF NOT EXISTS snapshot_course_title text,
  ADD COLUMN IF NOT EXISTS snapshot_session_titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_total_sessions integer,
  ADD COLUMN IF NOT EXISTS snapshot_session_duration integer,
  ADD COLUMN IF NOT EXISTS snapshot_total_minor integer,
  ADD COLUMN IF NOT EXISTS snapshot_currency text;

-- Unique constraint on order_number (allows nulls during backfill, enforces uniqueness when present)
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON public.orders (order_number)
  WHERE order_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_learner_scheduled_idx
  ON public.orders (learner_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS orders_mentor_scheduled_idx
  ON public.orders (mentor_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS orders_booking_id_idx
  ON public.orders (booking_id);

-- Generator: ORD- + 6 random base32-ish chars, retry on collision
CREATE OR REPLACE FUNCTION public.generate_unique_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
  found int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I confusion
  i int;
BEGIN
  LOOP
    candidate := 'ORD-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
    END LOOP;
    SELECT 1 INTO found FROM public.orders WHERE order_number = candidate LIMIT 1;
    IF found IS NULL THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Unable to generate unique order_number after 50 attempts';
    END IF;
  END LOOP;
END;
$$;

-- BEFORE INSERT trigger to assign order_number when null
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_unique_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_assign_order_number ON public.orders;
CREATE TRIGGER orders_assign_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_order_number();