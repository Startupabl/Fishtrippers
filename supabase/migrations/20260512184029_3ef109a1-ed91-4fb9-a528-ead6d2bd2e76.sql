ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS session_length_minutes integer NOT NULL DEFAULT 45;

UPDATE public.journeys SET capacity = 1 WHERE capacity IS NULL OR capacity = 0;
UPDATE public.journeys SET session_length_minutes = 45 WHERE session_length_minutes IS NULL;

ALTER TABLE public.journeys
  ADD CONSTRAINT journeys_capacity_range CHECK (capacity BETWEEN 1 AND 50),
  ADD CONSTRAINT journeys_session_length_valid CHECK (session_length_minutes IN (30, 45, 60, 90));