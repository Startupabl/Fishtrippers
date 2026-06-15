ALTER TABLE public.platform_settings ALTER COLUMN platform_fee_pct SET DEFAULT 14.5;
UPDATE public.platform_settings SET platform_fee_pct = 14.5 WHERE id = 1 AND platform_fee_pct = 10;