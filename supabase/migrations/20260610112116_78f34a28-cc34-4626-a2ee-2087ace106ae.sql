
ALTER TABLE public.platform_stripe_secrets
  ADD COLUMN IF NOT EXISTS stripe_checkout_webhook_secret text,
  ADD COLUMN IF NOT EXISTS stripe_connect_webhook_secret text;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS stripe_checkout_webhook_set boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_webhook_set boolean NOT NULL DEFAULT false;

-- Seed the Connect webhook secret from the existing test webhook secret
-- (the one the user has already verified in production Connect flow).
UPDATE public.platform_stripe_secrets
SET stripe_connect_webhook_secret = COALESCE(stripe_connect_webhook_secret, stripe_test_webhook_secret, stripe_live_webhook_secret)
WHERE id = 1;

UPDATE public.platform_settings
SET stripe_connect_webhook_set = TRUE
WHERE id = 1
  AND EXISTS (
    SELECT 1 FROM public.platform_stripe_secrets s
    WHERE s.id = 1 AND s.stripe_connect_webhook_secret IS NOT NULL
  );
