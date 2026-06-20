CREATE OR REPLACE FUNCTION public.operators_assign_slugs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;