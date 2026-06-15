CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  listing_id uuid NOT NULL,
  aide_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  order_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 50),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  UNIQUE (order_id, learner_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_learner ON public.reviews(learner_id);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Learners insert own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = learner_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.learner_id = auth.uid()
        AND o.order_status = 'completed'
    )
  );

CREATE POLICY "Learners update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = learner_id);

CREATE POLICY "Learners delete own reviews" ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = learner_id);

CREATE POLICY "Admins read all reviews" ON public.reviews FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));