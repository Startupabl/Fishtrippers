CREATE TYPE public.trip_charter_type AS ENUM ('private_charter', 'shared_tour');

ALTER TABLE public.trip_packages
  ADD COLUMN charter_type public.trip_charter_type NOT NULL DEFAULT 'private_charter',
  ADD COLUMN seats_available integer;