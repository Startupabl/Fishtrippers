
-- 1. Refresh the search-vector trigger to drop the subcategory reference.
CREATE OR REPLACE FUNCTION public.journeys_refresh_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.tags, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C');
  RETURN NEW;
END;
$function$;

-- 2. Drop subcategory from journeys.
ALTER TABLE public.journeys DROP COLUMN IF EXISTS subcategory;

-- 3. Many-to-many tag <-> main category links.
CREATE TABLE IF NOT EXISTS public.tag_category_links (
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (tag_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_tag_category_links_category ON public.tag_category_links(category_id);
CREATE INDEX IF NOT EXISTS idx_tag_category_links_tag ON public.tag_category_links(tag_id);

-- Only parent categories can be linked from a tag.
CREATE OR REPLACE FUNCTION public.enforce_tag_category_is_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE pid uuid;
BEGIN
  SELECT parent_id INTO pid FROM public.categories WHERE id = NEW.category_id;
  IF pid IS NOT NULL THEN
    RAISE EXCEPTION 'Tags can only be linked to top-level (parent) categories';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_tag_category_links_parent_only ON public.tag_category_links;
CREATE TRIGGER trg_tag_category_links_parent_only
  BEFORE INSERT OR UPDATE ON public.tag_category_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tag_category_is_parent();

ALTER TABLE public.tag_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tag category links public read"
  ON public.tag_category_links FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins insert tag category links"
  ON public.tag_category_links FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete tag category links"
  ON public.tag_category_links FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Backfill links from the existing single tags.category column.
INSERT INTO public.tag_category_links (tag_id, category_id)
SELECT t.id, c.id
FROM public.tags t
JOIN public.categories c
  ON c.parent_id IS NULL AND lower(c.name) = lower(t.category)
ON CONFLICT DO NOTHING;

-- 5. Drop the old single-category column on tags.
ALTER TABLE public.tags DROP COLUMN IF EXISTS category;

-- 6. Update RPCs that referenced tags.category.
DROP FUNCTION IF EXISTS public.list_unknown_tags();
CREATE OR REPLACE FUNCTION public.list_unknown_tags()
 RETURNS TABLE(name text, usage_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH journey_tags AS (
    SELECT lower(trim(t)) AS norm, t AS original
    FROM public.journeys j, unnest(j.tags) AS t
    WHERE t IS NOT NULL AND length(trim(t)) > 0
  ),
  known AS (
    SELECT lower(tg.name) AS norm FROM public.tags tg
  ),
  grouped AS (
    SELECT
      (array_agg(jt.original ORDER BY jt.original))[1]::text AS out_name,
      count(*)::int AS out_count
    FROM journey_tags jt
    WHERE jt.norm NOT IN (SELECT norm FROM known)
    GROUP BY jt.norm
  )
  SELECT g.out_name, g.out_count
  FROM grouped g
  ORDER BY g.out_count DESC, g.out_name ASC;
END;
$function$;
