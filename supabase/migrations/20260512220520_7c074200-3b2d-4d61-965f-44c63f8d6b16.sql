
ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS portfolio_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS showcase_intro text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-portfolio', 'listing-portfolio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Listing portfolio public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-portfolio');

CREATE POLICY "Mentor uploads to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Mentor updates own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Mentor deletes own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE TABLE public.journey_portfolio_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  asset_id text,
  reporter_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.journey_portfolio_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can flag portfolio assets"
  ON public.journey_portfolio_flags FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Mentor reads flags on own journeys"
  ON public.journey_portfolio_flags FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journeys j
    WHERE j.id = journey_portfolio_flags.journey_id
      AND j.mentor_id = auth.uid()
  ));

CREATE INDEX idx_journey_portfolio_flags_journey ON public.journey_portfolio_flags(journey_id);
