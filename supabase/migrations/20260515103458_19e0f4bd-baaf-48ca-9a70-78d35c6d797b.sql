ALTER TABLE public.journeys ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS journeys_featured_idx ON public.journeys(featured) WHERE featured = true;