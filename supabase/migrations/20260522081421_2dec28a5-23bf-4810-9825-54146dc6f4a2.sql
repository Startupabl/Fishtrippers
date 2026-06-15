ALTER TABLE public.journeys ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn FROM public.journeys
)
UPDATE public.journeys j SET sort_order = ranked.rn FROM ranked WHERE j.id = ranked.id;

CREATE INDEX IF NOT EXISTS journeys_sort_order_idx ON public.journeys (sort_order);