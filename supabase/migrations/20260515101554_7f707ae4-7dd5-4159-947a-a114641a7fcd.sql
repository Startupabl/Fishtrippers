
-- IP history per user
CREATE TABLE public.ip_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip text NOT NULL,
  user_agent text,
  seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_history_user_seen ON public.ip_history (user_id, seen_at DESC);

ALTER TABLE public.ip_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ip history"
  ON public.ip_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Login count on profiles
ALTER TABLE public.profiles
  ADD COLUMN login_count integer NOT NULL DEFAULT 0;

-- Trigger: bump login_count when last_sign_in_at changes
CREATE OR REPLACE FUNCTION public.handle_user_signed_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
     AND NEW.last_sign_in_at IS NOT NULL THEN
    UPDATE public.profiles
      SET login_count = login_count + 1
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
CREATE TRIGGER on_auth_user_signed_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_signed_in();
