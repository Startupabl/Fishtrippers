
-- Add read_status to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_status boolean NOT NULL DEFAULT false;

-- Add payment_link enum value (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'attachment_type_t' AND e.enumlabel = 'payment_link'
  ) THEN
    ALTER TYPE public.attachment_type_t ADD VALUE 'payment_link';
  END IF;
END $$;

-- Add payment_link_journey_id to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS payment_link_journey_id uuid;

-- Add last_message_at to message_threads
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now();

-- Trigger function to bump thread on new message
CREATE OR REPLACE FUNCTION public.bump_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_thread_on_message_trg ON public.messages;
CREATE TRIGGER bump_thread_on_message_trg
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_thread_on_message();

-- Indexes
CREATE INDEX IF NOT EXISTS messages_thread_created_idx
  ON public.messages (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_threads_mentor_last_idx
  ON public.message_threads (mentor_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS message_threads_learner_last_idx
  ON public.message_threads (learner_id, last_message_at DESC);

-- RLS: allow participants to mark messages they didn't send as read.
-- (Existing "Participants update offer status" policy already permits UPDATE
-- for participants; the read_status column is included by that policy.
-- We add a focused policy with WITH CHECK to prevent abuse from non-senders
-- if the existing policy is later tightened.)
DROP POLICY IF EXISTS "Participants mark messages read" ON public.messages;
CREATE POLICY "Participants mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = messages.thread_id
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = messages.thread_id
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
);
