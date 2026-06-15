ALTER TABLE public.promo_codes
  ADD COLUMN journey_id uuid,
  ADD COLUMN discount_type text NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent','fixed')),
  ADD COLUMN expires_at timestamptz;

CREATE INDEX IF NOT EXISTS promo_codes_journey_id_idx ON public.promo_codes(journey_id);
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_journey_code_unique
  ON public.promo_codes(journey_id, upper(code))
  WHERE journey_id IS NOT NULL;