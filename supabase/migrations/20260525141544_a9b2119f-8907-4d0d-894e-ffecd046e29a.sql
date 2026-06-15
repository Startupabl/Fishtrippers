
-- 1. Status enum and class_sessions table (no policies yet that reference bookings)
CREATE TYPE public.class_session_status_t AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aide_id uuid NOT NULL,
  course_id uuid,
  listing_title text NOT NULL,
  session_dates_times_array jsonb NOT NULL DEFAULT '[]'::jsonb,
  jitsi_url text NOT NULL,
  max_seats integer NOT NULL DEFAULT 1,
  filled_seats integer NOT NULL DEFAULT 0,
  admin_label text,
  status public.class_session_status_t NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_sessions_seats_check CHECK (filled_seats >= 0 AND filled_seats <= max_seats),
  CONSTRAINT class_sessions_max_seats_check CHECK (max_seats >= 1 AND max_seats <= 50)
);

CREATE INDEX idx_class_sessions_aide_id ON public.class_sessions(aide_id);
CREATE INDEX idx_class_sessions_course_id ON public.class_sessions(course_id);

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add class_session_id to bookings FIRST so subsequent policies can reference it
ALTER TABLE public.bookings
  ADD COLUMN class_session_id uuid REFERENCES public.class_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_class_session_id ON public.bookings(class_session_id);

-- 3. Now create RLS policies on class_sessions
CREATE POLICY "Aides manage own class sessions select"
  ON public.class_sessions FOR SELECT TO authenticated
  USING (auth.uid() = aide_id);

CREATE POLICY "Aides manage own class sessions insert"
  ON public.class_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = aide_id);

CREATE POLICY "Aides manage own class sessions update"
  ON public.class_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = aide_id);

CREATE POLICY "Aides manage own class sessions delete"
  ON public.class_sessions FOR DELETE TO authenticated
  USING (auth.uid() = aide_id);

CREATE POLICY "Admins read all class sessions"
  ON public.class_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Learners read linked class sessions"
  ON public.class_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.class_session_id = class_sessions.id
      AND b.learner_id = auth.uid()
  ));

-- 4. Add offer_expires_at on messages
ALTER TABLE public.messages
  ADD COLUMN offer_expires_at timestamptz;

-- 5. RPC to atomically increment filled_seats
CREATE OR REPLACE FUNCTION public.increment_class_session_seats(_class_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cs public.class_sessions%ROWTYPE;
BEGIN
  SELECT * INTO cs FROM public.class_sessions WHERE id = _class_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF cs.filled_seats >= cs.max_seats THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full', 'filled_seats', cs.filled_seats, 'max_seats', cs.max_seats);
  END IF;
  UPDATE public.class_sessions
    SET filled_seats = filled_seats + 1
    WHERE id = _class_session_id;
  RETURN jsonb_build_object('ok', true, 'filled_seats', cs.filled_seats + 1, 'max_seats', cs.max_seats);
END;
$$;
