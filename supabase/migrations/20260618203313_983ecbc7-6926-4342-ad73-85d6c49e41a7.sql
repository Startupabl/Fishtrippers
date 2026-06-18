ALTER TABLE public.trip_packages
  ADD COLUMN IF NOT EXISTS min_seats_to_sail integer NULL
  CHECK (min_seats_to_sail IS NULL OR min_seats_to_sail >= 1);