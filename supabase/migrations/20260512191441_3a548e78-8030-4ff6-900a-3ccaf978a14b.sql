
-- 1. journeys: course_id_slug + LMN sequence + discount_percentage
CREATE SEQUENCE IF NOT EXISTS public.course_id_seq START 1000;

CREATE OR REPLACE FUNCTION public.next_course_id_slug()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'LMN-' || nextval('public.course_id_seq')::text;
$$;

ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS course_id_slug text,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

UPDATE public.journeys
  SET course_id_slug = public.next_course_id_slug()
  WHERE course_id_slug IS NULL;

ALTER TABLE public.journeys
  ALTER COLUMN course_id_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS journeys_course_id_slug_key
  ON public.journeys(course_id_slug);

CREATE OR REPLACE FUNCTION public.assign_course_id_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.course_id_slug IS NULL THEN
    NEW.course_id_slug := public.next_course_id_slug();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journeys_assign_course_id_slug ON public.journeys;
CREATE TRIGGER journeys_assign_course_id_slug
  BEFORE INSERT ON public.journeys
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_course_id_slug();

-- 2. profiles: bio_custom
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_custom text;

-- 3. inquiries
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  course_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aide_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_body text NOT NULL,
  preferred_time text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','closed'))
);

CREATE INDEX IF NOT EXISTS inquiries_aide_status_idx
  ON public.inquiries(aide_id, status);
CREATE INDEX IF NOT EXISTS inquiries_learner_created_idx
  ON public.inquiries(learner_id, created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learner creates own inquiries"
  ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learner reads own inquiries"
  ON public.inquiries FOR SELECT TO authenticated
  USING (auth.uid() = learner_id);

CREATE POLICY "Aide reads inquiries against them"
  ON public.inquiries FOR SELECT TO authenticated
  USING (auth.uid() = aide_id);

CREATE POLICY "Aide updates own inquiries"
  ON public.inquiries FOR UPDATE TO authenticated
  USING (auth.uid() = aide_id);

-- 4. promo_codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  is_active boolean NOT NULL DEFAULT true,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_lower_idx
  ON public.promo_codes(lower(code));

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active promo codes public read"
  ON public.promo_codes FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Owner inserts own promo codes"
  ON public.promo_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner updates own promo codes"
  ON public.promo_codes FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owner deletes own promo codes"
  ON public.promo_codes FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);
