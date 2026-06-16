ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS default_departure_city text,
  ADD COLUMN IF NOT EXISTS default_departure_state text,
  ADD COLUMN IF NOT EXISTS default_departure_country text;
CREATE INDEX IF NOT EXISTS operators_default_departure_city_state_idx
  ON public.operators (default_departure_city, default_departure_state);