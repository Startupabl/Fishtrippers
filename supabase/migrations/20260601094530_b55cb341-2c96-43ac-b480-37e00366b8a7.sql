-- A. Archive system: per-user archive timestamps on message_threads
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS learner_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS mentor_archived_at timestamptz;

-- Allow participants to update their own archive flag (column-restricted grant)
GRANT UPDATE (learner_archived_at, mentor_archived_at) ON public.message_threads TO authenticated;

DROP POLICY IF EXISTS "Participants update own archive" ON public.message_threads;
CREATE POLICY "Participants update own archive"
ON public.message_threads
FOR UPDATE
TO authenticated
USING (auth.uid() = learner_id OR auth.uid() = mentor_id)
WITH CHECK (auth.uid() = learner_id OR auth.uid() = mentor_id);

-- Extend bump_thread_on_message to also auto-unarchive for both sides on new activity
CREATE OR REPLACE FUNCTION public.bump_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      learner_archived_at = NULL,
      mentor_archived_at = NULL
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$function$;

-- B. File sharing: new bucket + columns + enum value
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: participants can read; participants can upload to {thread_id}/...
DROP POLICY IF EXISTS "Message attachments participants read" ON storage.objects;
CREATE POLICY "Message attachments participants read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Message attachments participants upload" ON storage.objects;
CREATE POLICY "Message attachments participants upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
);

-- Add 'file' to attachment_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'attachment_type_t' AND e.enumlabel = 'file'
  ) THEN
    ALTER TYPE public.attachment_type_t ADD VALUE 'file';
  END IF;
END$$;

-- Attachment columns on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes integer;
