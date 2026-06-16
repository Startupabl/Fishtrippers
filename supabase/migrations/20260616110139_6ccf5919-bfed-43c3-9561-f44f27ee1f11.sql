
-- Extend operators with admin-listing fields
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS listing_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- status check
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name='operators' AND constraint_name='operators_status_check'
  ) THEN
    ALTER TABLE public.operators
      ADD CONSTRAINT operators_status_check CHECK (status IN ('draft','published','archived'));
  END IF;
END $$;

-- listing number generator
CREATE OR REPLACE FUNCTION public.generate_unique_listing_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  candidate text;
  attempts int := 0;
  found int;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  LOOP
    candidate := 'LST-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
    END LOOP;
    SELECT 1 INTO found FROM public.operators WHERE listing_number = candidate LIMIT 1;
    IF found IS NULL THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Unable to generate unique listing_number after 50 attempts';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_listing_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.listing_number IS NULL THEN
    NEW.listing_number := public.generate_unique_listing_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_listing_number_trigger ON public.operators;
CREATE TRIGGER assign_listing_number_trigger
  BEFORE INSERT ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.assign_listing_number();

-- Backfill existing rows
UPDATE public.operators SET listing_number = public.generate_unique_listing_number()
  WHERE listing_number IS NULL;

CREATE INDEX IF NOT EXISTS operators_priority_created_idx
  ON public.operators (priority_order DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS operators_status_idx ON public.operators (status);
