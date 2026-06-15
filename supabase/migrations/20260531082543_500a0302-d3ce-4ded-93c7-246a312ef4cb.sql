ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS cohort_title text NULL,
  ADD COLUMN IF NOT EXISTS price_minor integer NULL,
  ADD COLUMN IF NOT EXISTS currency text NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS is_public_cohort boolean NOT NULL DEFAULT false;