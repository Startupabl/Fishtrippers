-- 1) Add is_seeded flag and mark all existing tags as part of Master Library
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS is_seeded boolean NOT NULL DEFAULT false;

UPDATE public.tags SET is_seeded = true WHERE is_seeded = false;

-- New tags created from here on default to custom (is_seeded=false).
ALTER TABLE public.tags ALTER COLUMN is_seeded SET DEFAULT false;

-- 2) Purge routine: delete non-seeded tags not referenced by any journey
CREATE OR REPLACE FUNCTION public.purge_unused_custom_tags()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  WITH used AS (
    SELECT DISTINCT lower(trim(t)) AS norm
    FROM public.journeys j, unnest(j.tags) AS t
    WHERE t IS NOT NULL AND length(trim(t)) > 0
  ),
  to_delete AS (
    DELETE FROM public.tags tg
    WHERE tg.is_seeded = false
      AND lower(tg.name) NOT IN (SELECT norm FROM used)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM to_delete;
  RETURN deleted_count;
END;
$$;

-- 3) Trigger: re-purge after any journey insert/update/delete that touches tags
CREATE OR REPLACE FUNCTION public.tg_purge_unused_custom_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.purge_unused_custom_tags();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS journeys_purge_custom_tags ON public.journeys;
CREATE TRIGGER journeys_purge_custom_tags
AFTER INSERT OR UPDATE OF tags OR DELETE ON public.journeys
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_purge_unused_custom_tags();

-- 4) Run an initial cleanup pass on existing data
SELECT public.purge_unused_custom_tags();