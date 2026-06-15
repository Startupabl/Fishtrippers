-- 1. Ensure 'admin' value exists in app_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;

-- 2. Moderation status enum + column on journeys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_moderation_status') THEN
    CREATE TYPE public.journey_moderation_status AS ENUM ('pending', 'approved', 'declined');
  END IF;
END $$;

ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS moderation_status public.journey_moderation_status NOT NULL DEFAULT 'pending';

-- Backfill existing journeys to approved so nothing currently visible disappears.
UPDATE public.journeys SET moderation_status = 'approved' WHERE moderation_status = 'pending';

-- 3. Resolved_at on portfolio flags
ALTER TABLE public.journey_portfolio_flags
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- 4. Tighten the public read policy on journeys
DROP POLICY IF EXISTS "Published journeys public read" ON public.journeys;
CREATE POLICY "Published journeys public read"
  ON public.journeys FOR SELECT
  TO public
  USING (status = 'published' AND moderation_status = 'approved');

-- 5. Admin can read/update key tables
CREATE POLICY "Admins read all journeys"
  ON public.journeys FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update journeys"
  ON public.journeys FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all flags"
  ON public.journey_portfolio_flags FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update flags"
  ON public.journey_portfolio_flags FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Seed admin role for cruz.collective.llc@gmail.com (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.email = 'cruz.collective.llc@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;