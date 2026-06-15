CREATE TABLE public.mentor_availability (
  mentor_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paused boolean NOT NULL DEFAULT false,
  slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability public read"
  ON public.mentor_availability FOR SELECT
  USING (true);

CREATE POLICY "Mentors insert own availability"
  ON public.mentor_availability FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors update own availability"
  ON public.mentor_availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors delete own availability"
  ON public.mentor_availability FOR DELETE
  TO authenticated
  USING (auth.uid() = mentor_id);

CREATE TRIGGER update_mentor_availability_updated_at
  BEFORE UPDATE ON public.mentor_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();