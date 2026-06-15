
-- Reviews: remove broad public read; admins/learners still covered by existing policies; app reads via service role.
DROP POLICY IF EXISTS "Reviews public read" ON public.reviews;

CREATE POLICY "Learners read own reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (auth.uid() = learner_id);

-- Storage: allow thread participants to update/delete their message attachments
CREATE POLICY "Message attachments participants update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id::text = (storage.foldername(objects.name))[1]
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id::text = (storage.foldername(objects.name))[1]
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
);

CREATE POLICY "Message attachments participants delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id::text = (storage.foldername(objects.name))[1]
      AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
  )
);
