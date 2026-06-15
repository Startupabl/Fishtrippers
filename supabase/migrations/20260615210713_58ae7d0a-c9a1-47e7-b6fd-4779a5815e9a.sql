CREATE TYPE public.operator_primary_category AS ENUM ('offshore', 'inshore', 'freshwater', 'fly');

ALTER TABLE public.operators
  ADD COLUMN primary_category public.operator_primary_category,
  ADD COLUMN target_species text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX operators_primary_category_idx ON public.operators (primary_category);
CREATE INDEX operators_target_species_idx ON public.operators USING GIN (target_species);