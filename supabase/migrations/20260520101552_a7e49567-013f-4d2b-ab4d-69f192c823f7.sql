
-- Backfill any missing/empty slugs from title + short random suffix.
UPDATE public.journeys
SET slug = regexp_replace(
  regexp_replace(lower(coalesce(nullif(trim(title), ''), 'listing')), '[^a-z0-9]+', '-', 'g'),
  '(^-+|-+$)', '', 'g'
) || '-' || substr(md5(random()::text || id::text), 1, 6)
WHERE slug IS NULL OR length(trim(slug)) = 0;

-- Deduplicate any existing collisions before adding the unique index.
WITH dups AS (
  SELECT id, slug,
    row_number() OVER (PARTITION BY lower(slug) ORDER BY created_at) AS rn
  FROM public.journeys
  WHERE slug IS NOT NULL
)
UPDATE public.journeys j
SET slug = j.slug || '-' || substr(md5(random()::text || j.id::text), 1, 6)
FROM dups
WHERE j.id = dups.id AND dups.rn > 1;

-- Unique case-insensitive index on slug.
CREATE UNIQUE INDEX IF NOT EXISTS journeys_slug_unique_ci
  ON public.journeys (lower(slug))
  WHERE slug IS NOT NULL;
