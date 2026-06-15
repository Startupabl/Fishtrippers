ALTER TABLE public.journeys ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.journeys SET slug = id::text WHERE slug IS NULL;
ALTER TABLE public.journeys ALTER COLUMN slug SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journeys_slug_key') THEN
    ALTER TABLE public.journeys ADD CONSTRAINT journeys_slug_key UNIQUE (slug);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS journeys_search_vector_idx ON public.journeys USING gin(search_vector);