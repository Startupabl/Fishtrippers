CREATE TABLE public.user_favorites (
  user_id uuid NOT NULL,
  journey_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, journey_id)
);

CREATE INDEX user_favorites_user_created_idx ON public.user_favorites (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own favorites"
ON public.user_favorites FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own favorites"
ON public.user_favorites FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own favorites"
ON public.user_favorites FOR DELETE TO authenticated
USING (auth.uid() = user_id);