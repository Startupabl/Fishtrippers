
-- 1. Drop seat-increment RPC (cohort concept)
DROP FUNCTION IF EXISTS public.increment_class_session_seats(uuid);

-- 2. Strip cohort-only columns
ALTER TABLE public.class_sessions
  DROP COLUMN IF EXISTS max_seats,
  DROP COLUMN IF EXISTS filled_seats,
  DROP COLUMN IF EXISTS admin_label,
  DROP COLUMN IF EXISTS is_live,
  DROP COLUMN IF EXISTS live_started_at,
  DROP COLUMN IF EXISTS live_ended_at,
  DROP COLUMN IF EXISTS cohort_title,
  DROP COLUMN IF EXISTS price_minor,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS is_public_cohort;

-- 3. Rename table + booking FK column
ALTER TABLE public.class_sessions RENAME TO trip_sessions;
ALTER TABLE public.bookings RENAME COLUMN class_session_id TO trip_session_id;

-- 4. Rename RLS policies for clarity
ALTER POLICY "Admins read all class sessions"           ON public.trip_sessions RENAME TO "Admins read all trip sessions";
ALTER POLICY "Aides manage own class sessions delete"   ON public.trip_sessions RENAME TO "Aides manage own trip sessions delete";
ALTER POLICY "Aides manage own class sessions insert"   ON public.trip_sessions RENAME TO "Aides manage own trip sessions insert";
ALTER POLICY "Aides manage own class sessions select"   ON public.trip_sessions RENAME TO "Aides manage own trip sessions select";
ALTER POLICY "Aides manage own class sessions update"   ON public.trip_sessions RENAME TO "Aides manage own trip sessions update";
ALTER POLICY "Learners read linked class sessions"      ON public.trip_sessions RENAME TO "Learners read linked trip sessions";

-- 5. Update Learners-read policy to reference the renamed booking column
DROP POLICY "Learners read linked trip sessions" ON public.trip_sessions;
CREATE POLICY "Learners read linked trip sessions"
  ON public.trip_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.trip_session_id = trip_sessions.id
      AND b.learner_id = auth.uid()
  ));

-- 6. Rebuild the tamper-prevention trigger function to use the new column name
CREATE OR REPLACE FUNCTION public.prevent_booking_field_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.total_price        IS DISTINCT FROM OLD.total_price
  OR NEW.aide_earnings      IS DISTINCT FROM OLD.aide_earnings
  OR NEW.service_fee_amount IS DISTINCT FROM OLD.service_fee_amount
  OR NEW.currency           IS DISTINCT FROM OLD.currency
  OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
  OR NEW.learner_id         IS DISTINCT FROM OLD.learner_id
  OR NEW.aide_id            IS DISTINCT FROM OLD.aide_id
  OR NEW.course_id          IS DISTINCT FROM OLD.course_id
  OR NEW.thread_id          IS DISTINCT FROM OLD.thread_id
  OR NEW.trip_session_id    IS DISTINCT FROM OLD.trip_session_id
  OR NEW.promo_code_id      IS DISTINCT FROM OLD.promo_code_id THEN
    RAISE EXCEPTION 'Not allowed to modify protected booking fields';
  END IF;
  RETURN NEW;
END;
$function$;
