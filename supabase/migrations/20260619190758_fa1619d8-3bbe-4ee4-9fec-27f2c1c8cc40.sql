ALTER TABLE public.reviews ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_id uuid NULL;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_learner_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_learner_unique
  ON public.reviews (order_id, learner_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_learner_unique
  ON public.reviews (booking_id, learner_id) WHERE booking_id IS NOT NULL;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_source_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_source_check
  CHECK ((order_id IS NOT NULL)::int + (booking_id IS NOT NULL)::int = 1);

DROP POLICY IF EXISTS "Learners insert booking reviews" ON public.reviews;
CREATE POLICY "Learners insert booking reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = learner_id
    AND booking_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.learner_id = auth.uid()
        AND b.status = 'completed'::public.booking_status_t
    )
  );
