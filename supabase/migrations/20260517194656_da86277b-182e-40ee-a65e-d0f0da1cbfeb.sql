ALTER TABLE public.journeys ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE public.journeys DROP CONSTRAINT IF EXISTS journeys_experience_level_check;
ALTER TABLE public.journeys ADD CONSTRAINT journeys_experience_level_check CHECK (experience_level IS NULL OR experience_level IN ('Beginner','Intermediate','Advanced'));