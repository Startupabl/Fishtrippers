
-- newsletter_subscribers: explicit admin-only read
DROP POLICY IF EXISTS "Admins read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- platform_settings: remove public read, add admin-only read
DROP POLICY IF EXISTS "Platform settings public read" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins read platform settings" ON public.platform_settings;
CREATE POLICY "Admins read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- promo_codes: restrict active read to authenticated only
DROP POLICY IF EXISTS "Active promo codes public read" ON public.promo_codes;
CREATE POLICY "Active promo codes authenticated read" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (is_active = true);

-- user_alerts: remove user self-insert; only admins (via existing policy) or
-- service_role server code can create alerts now.
DROP POLICY IF EXISTS "Users insert own alerts" ON public.user_alerts;
