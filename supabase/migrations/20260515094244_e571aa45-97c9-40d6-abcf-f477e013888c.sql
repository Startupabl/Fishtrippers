
ALTER TYPE public.user_status_t ADD VALUE IF NOT EXISTS 'blocked';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_ip text,
  ADD COLUMN IF NOT EXISTS last_ip_at timestamptz;

CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid primary key default gen_random_uuid(),
  ip text not null unique,
  blocked_by uuid,
  reason text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read blocked ips" ON public.blocked_ips
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert blocked ips" ON public.blocked_ips
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete blocked ips" ON public.blocked_ips
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
