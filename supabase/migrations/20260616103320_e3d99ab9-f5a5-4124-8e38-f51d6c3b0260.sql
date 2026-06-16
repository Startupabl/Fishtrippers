ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS default_departure_address text,
  ADD COLUMN IF NOT EXISTS default_departure_lat double precision,
  ADD COLUMN IF NOT EXISTS default_departure_lng double precision,
  ADD COLUMN IF NOT EXISTS default_departure_place_id text;