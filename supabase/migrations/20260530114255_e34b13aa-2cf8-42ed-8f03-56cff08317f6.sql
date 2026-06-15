DROP FUNCTION IF EXISTS public.assign_moderator_password() CASCADE;
ALTER TABLE public.class_sessions DROP COLUMN IF EXISTS jitsi_url;
ALTER TABLE public.class_sessions DROP COLUMN IF EXISTS moderator_password;