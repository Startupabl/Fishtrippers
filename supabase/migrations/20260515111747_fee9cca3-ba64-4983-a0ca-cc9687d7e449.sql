
CREATE TYPE public.user_alert_kind AS ENUM ('listing_pending', 'listing_live', 'listing_declined');

CREATE TABLE public.user_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.user_alert_kind NOT NULL,
  journey_id uuid,
  message text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_alerts_user_created ON public.user_alerts(user_id, created_at DESC);

ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own alerts"
  ON public.user_alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own alerts read"
  ON public.user_alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all alerts"
  ON public.user_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert alerts"
  ON public.user_alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own alerts"
  ON public.user_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
