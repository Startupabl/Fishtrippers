
-- Add live-session fields to class_sessions
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS live_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderator_password text;

-- Backfill moderator_password for existing rows
UPDATE public.class_sessions
SET moderator_password = encode(gen_random_bytes(12), 'hex')
WHERE moderator_password IS NULL;

-- Default-generate moderator_password for future rows
CREATE OR REPLACE FUNCTION public.assign_moderator_password()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.moderator_password IS NULL THEN
    NEW.moderator_password := encode(gen_random_bytes(12), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_sessions_assign_pwd ON public.class_sessions;
CREATE TRIGGER trg_class_sessions_assign_pwd
BEFORE INSERT ON public.class_sessions
FOR EACH ROW
EXECUTE FUNCTION public.assign_moderator_password();

-- Realtime: emit full rows on UPDATE so Learners can see is_live flip
ALTER TABLE public.class_sessions REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'class_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.class_sessions';
  END IF;
END $$;
