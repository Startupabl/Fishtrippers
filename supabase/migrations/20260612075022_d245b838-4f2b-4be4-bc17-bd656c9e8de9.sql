
-- 1. bookings: restrict authenticated UPDATE to status column only.
REVOKE UPDATE ON public.bookings FROM authenticated;
GRANT UPDATE (status) ON public.bookings TO authenticated;

-- 2. orders: restrict authenticated UPDATE to status/sessions_remaining; drop learner UPDATE policy.
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (order_status, sessions_remaining) ON public.orders TO authenticated;
DROP POLICY IF EXISTS "Learner updates own orders" ON public.orders;

-- 3. journey_portfolio_flags: replace anonymous insert with authenticated, owner-bound insert.
DROP POLICY IF EXISTS "Anyone can flag portfolio assets" ON public.journey_portfolio_flags;
CREATE POLICY "Authenticated users flag portfolio assets"
  ON public.journey_portfolio_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- 4. newsletter_subscribers: allow users to delete their own subscription
--    (row whose email matches their verified session email).
DROP POLICY IF EXISTS "Subscribers can unsubscribe themselves" ON public.newsletter_subscribers;
CREATE POLICY "Subscribers can unsubscribe themselves"
  ON public.newsletter_subscribers
  FOR DELETE
  TO authenticated
  USING (
    email IS NOT NULL
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
GRANT DELETE ON public.newsletter_subscribers TO authenticated;
