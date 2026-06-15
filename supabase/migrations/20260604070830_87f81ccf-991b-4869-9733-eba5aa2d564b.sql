CREATE TABLE IF NOT EXISTS public.platform_stripe_secrets (
  id smallint PRIMARY KEY CHECK (id = 1),
  stripe_test_secret_key text,
  stripe_test_webhook_secret text,
  stripe_live_secret_key text,
  stripe_live_webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_stripe_secrets TO service_role;

ALTER TABLE public.platform_stripe_secrets ENABLE ROW LEVEL SECURITY;

-- No policies for anon or authenticated: only service_role (server) can access.

INSERT INTO public.platform_stripe_secrets (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_platform_stripe_secrets_updated_at
  BEFORE UPDATE ON public.platform_stripe_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();