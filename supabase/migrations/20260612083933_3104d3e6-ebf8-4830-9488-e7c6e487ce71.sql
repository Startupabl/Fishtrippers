ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS priority_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS journeys_priority_created_idx
  ON public.journeys (priority_order DESC, created_at DESC)
  WHERE status = 'published' AND moderation_status = 'approved';