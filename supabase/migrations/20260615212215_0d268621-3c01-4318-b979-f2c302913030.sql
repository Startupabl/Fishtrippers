
ALTER TABLE public.trip_packages
  ADD COLUMN IF NOT EXISTS departure_address text,
  ADD COLUMN IF NOT EXISTS departure_lat double precision,
  ADD COLUMN IF NOT EXISTS departure_lng double precision,
  ADD COLUMN IF NOT EXISTS departure_place_id text,
  ADD COLUMN IF NOT EXISTS template_key text;

CREATE INDEX IF NOT EXISTS trip_packages_operator_status_idx
  ON public.trip_packages (operator_id, status);
