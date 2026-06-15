ALTER TABLE public.journeys
ADD COLUMN IF NOT EXISTS session_descriptions text[] NOT NULL DEFAULT '{}'::text[];