
-- Per-session completion log
CREATE TABLE public.order_session_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  session_index integer NOT NULL,
  completed_by uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, session_index)
);

GRANT SELECT, INSERT, DELETE ON public.order_session_completions TO authenticated;
GRANT ALL ON public.order_session_completions TO service_role;

ALTER TABLE public.order_session_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read session completions"
ON public.order_session_completions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_session_completions.order_id
    AND (o.learner_id = auth.uid() OR o.mentor_id = auth.uid())
));

CREATE POLICY "Aide inserts session completions"
ON public.order_session_completions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = completed_by
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_session_completions.order_id
      AND o.mentor_id = auth.uid()
  )
);

-- Certificate generator (CERT-YYYY-XXXX, 4-char uppercase no 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_unique_cert_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  attempts int := 0;
  found int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  year_part text := to_char(now(), 'YYYY');
BEGIN
  LOOP
    candidate := 'CERT-' || year_part || '-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
    END LOOP;
    SELECT 1 INTO found FROM public.course_certificates WHERE cert_number = candidate LIMIT 1;
    IF found IS NULL THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Unable to generate unique cert_number after 50 attempts';
    END IF;
  END LOOP;
END;
$$;

-- Certificates
CREATE TABLE public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  cert_number text NOT NULL UNIQUE,
  learner_id uuid NOT NULL,
  aide_id uuid NOT NULL,
  course_title text NOT NULL,
  learner_name text NOT NULL,
  aide_name text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_certificates TO authenticated;
GRANT ALL ON public.course_certificates TO service_role;

ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read certificates"
ON public.course_certificates FOR SELECT TO authenticated
USING (learner_id = auth.uid() OR aide_id = auth.uid());
