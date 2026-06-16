ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS fishing_environments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'USD';

ALTER TABLE public.trip_packages
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS itinerary text,
  ADD COLUMN IF NOT EXISTS target_species text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS environments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS techniques text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS per_extra_minor integer NOT NULL DEFAULT 0 CHECK (per_extra_minor >= 0);