
-- Enums
CREATE TYPE public.operator_business_type AS ENUM ('charter', 'guide');
CREATE TYPE public.operator_booking_type AS ENUM ('instant', 'inquiry');
CREATE TYPE public.operator_cancellation_policy AS ENUM ('flexible', 'moderate', 'strict');
CREATE TYPE public.trip_package_status AS ENUM ('draft', 'active', 'archived');

-- ============ operators ============
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type public.operator_business_type,
  display_name text,
  location text,
  booking_type public.operator_booking_type,
  advance_notice_hours integer CHECK (advance_notice_hours IN (6, 12, 24, 48)),
  cancellation_policy public.operator_cancellation_policy,
  moderation_status public.journey_moderation_status NOT NULL DEFAULT 'pending',
  moderation_note text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operators TO authenticated;
GRANT ALL ON public.operators TO service_role;

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own operator"
  ON public.operators FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins read all operators"
  ON public.operators FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update operators"
  ON public.operators FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read approved operators"
  ON public.operators FOR SELECT TO authenticated
  USING (moderation_status = 'approved'::public.journey_moderation_status);

CREATE TRIGGER operators_updated_at
  BEFORE UPDATE ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX operators_owner_idx ON public.operators(owner_id);
CREATE INDEX operators_moderation_idx ON public.operators(moderation_status);

-- ============ vessels ============
CREATE TABLE public.vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  manufacturer text,
  model text,
  year integer CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
  length_ft numeric(6,2) CHECK (length_ft IS NULL OR length_ft > 0),
  engine_type text,
  engine_size text,
  max_passenger_capacity integer NOT NULL CHECK (max_passenger_capacity >= 1 AND max_passenger_capacity <= 200),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vessels TO authenticated;
GRANT ALL ON public.vessels TO service_role;

ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own vessel"
  ON public.vessels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = vessels.operator_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = vessels.operator_id AND o.owner_id = auth.uid()));

CREATE POLICY "Admins read all vessels"
  ON public.vessels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read vessels of approved operators"
  ON public.vessels FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = vessels.operator_id AND o.moderation_status = 'approved'::public.journey_moderation_status));

CREATE TRIGGER vessels_updated_at
  BEFORE UPDATE ON public.vessels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX vessels_operator_idx ON public.vessels(operator_id);

-- ============ trip_packages ============
CREATE TABLE public.trip_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  vessel_id uuid REFERENCES public.vessels(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price_minor integer NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency text NOT NULL DEFAULT 'USD',
  max_party_size integer CHECK (max_party_size IS NULL OR max_party_size >= 1),
  status public.trip_package_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_packages TO authenticated;
GRANT ALL ON public.trip_packages TO service_role;

ALTER TABLE public.trip_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own trip packages"
  ON public.trip_packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = trip_packages.operator_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = trip_packages.operator_id AND o.owner_id = auth.uid()));

CREATE POLICY "Admins read all trip packages"
  ON public.trip_packages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read active trip packages"
  ON public.trip_packages FOR SELECT TO authenticated
  USING (status = 'active'::public.trip_package_status
    AND EXISTS (SELECT 1 FROM public.operators o WHERE o.id = trip_packages.operator_id AND o.moderation_status = 'approved'::public.journey_moderation_status));

CREATE TRIGGER trip_packages_updated_at
  BEFORE UPDATE ON public.trip_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX trip_packages_operator_idx ON public.trip_packages(operator_id);
CREATE INDEX trip_packages_vessel_idx ON public.trip_packages(vessel_id);
