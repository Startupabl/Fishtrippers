CREATE TABLE public.reported_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  reporter_id uuid,
  reason_category text NOT NULL,
  custom_details text,
  status text NOT NULL DEFAULT 'pending_review',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reported_listings_status ON public.reported_listings(status);
CREATE INDEX idx_reported_listings_listing_id ON public.reported_listings(listing_id);

GRANT INSERT ON public.reported_listings TO anon, authenticated;
GRANT SELECT, UPDATE ON public.reported_listings TO authenticated;
GRANT ALL ON public.reported_listings TO service_role;

ALTER TABLE public.reported_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a listing report"
ON public.reported_listings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins read all reports"
ON public.reported_listings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update reports"
ON public.reported_listings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure unique IP in blocked_ips for safe upsert
CREATE UNIQUE INDEX IF NOT EXISTS blocked_ips_ip_unique ON public.blocked_ips(ip);