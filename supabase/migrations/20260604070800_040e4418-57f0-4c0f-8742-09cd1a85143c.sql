ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS active_stripe_mode text NOT NULL DEFAULT 'test'
    CHECK (active_stripe_mode IN ('test', 'live')),
  ADD COLUMN IF NOT EXISTS stripe_test_publishable_key text,
  ADD COLUMN IF NOT EXISTS stripe_live_publishable_key text,
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric(5,2) NOT NULL DEFAULT 10.00
    CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 100),
  ADD COLUMN IF NOT EXISTS stripe_test_secret_set boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_test_webhook_set boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_live_secret_set boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_live_webhook_set boolean NOT NULL DEFAULT false;

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;