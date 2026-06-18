
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(public.unaccent(coalesce(_input, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS location_slug text;

UPDATE public.operators
SET location_slug = public.slugify(coalesce(default_departure_city, 'unknown'))
WHERE location_slug IS NULL;

UPDATE public.operators
SET slug = public.slugify(coalesce(display_name, listing_number))
WHERE slug IS NULL OR slug = '';

ALTER TABLE public.operators DROP CONSTRAINT IF EXISTS operators_slug_key;
DROP INDEX IF EXISTS public.operators_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS operators_location_slug_slug_uidx
  ON public.operators (location_slug, slug);
CREATE INDEX IF NOT EXISTS operators_location_slug_idx
  ON public.operators (location_slug);

CREATE TABLE IF NOT EXISTS public.operator_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  old_location_slug text NOT NULL,
  old_business_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operator_slug_history_old_pair_uidx
  ON public.operator_slug_history (old_location_slug, old_business_slug);

GRANT SELECT ON public.operator_slug_history TO anon, authenticated;
GRANT ALL ON public.operator_slug_history TO service_role;

ALTER TABLE public.operator_slug_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Slug history is publicly readable" ON public.operator_slug_history;
CREATE POLICY "Slug history is publicly readable"
  ON public.operator_slug_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.operators_assign_slugs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  attempt int := 0;
  new_loc text;
BEGIN
  new_loc := public.slugify(coalesce(NEW.default_departure_city, 'unknown'));
  IF new_loc IS NULL OR new_loc = '' THEN
    new_loc := 'unknown';
  END IF;
  NEW.location_slug := new_loc;

  IF TG_OP = 'INSERT'
     OR NEW.slug IS NULL
     OR NEW.slug = ''
     OR NEW.display_name IS DISTINCT FROM OLD.display_name
     OR NEW.location_slug IS DISTINCT FROM OLD.location_slug THEN

    base_slug := public.slugify(coalesce(NEW.display_name, NEW.listing_number, 'listing'));
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'listing';
    END IF;

    candidate := base_slug;
    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.operators
        WHERE location_slug = NEW.location_slug
          AND slug = candidate
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      );
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt::text;
      IF attempt > 100 THEN
        RAISE EXCEPTION 'Unable to generate unique operator slug';
      END IF;
    END LOOP;
    NEW.slug := candidate;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.slug IS NOT NULL
     AND OLD.location_slug IS NOT NULL
     AND (OLD.slug <> NEW.slug OR OLD.location_slug <> NEW.location_slug) THEN
    INSERT INTO public.operator_slug_history (operator_id, old_location_slug, old_business_slug)
    VALUES (NEW.id, OLD.location_slug, OLD.slug)
    ON CONFLICT (old_location_slug, old_business_slug) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operators_assign_slugs_trigger ON public.operators;
CREATE TRIGGER operators_assign_slugs_trigger
  BEFORE INSERT OR UPDATE ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.operators_assign_slugs();
