
-- 1) Defense-in-depth: prevent mentors from updating financial/protected columns on orders.
-- A trigger already blocks this, but add column-level REVOKEs so the database enforces it
-- at the privilege layer too.
REVOKE UPDATE (total_paid_minor, aide_payout_minor, platform_fee_minor, learner_id, mentor_id, order_number)
  ON public.orders FROM authenticated;

-- 2) Restrict newsletter unsubscribe via RLS to admins only. End users should unsubscribe
-- through a server-issued token flow (edge function / server fn), not by guessing emails.
DROP POLICY IF EXISTS "Subscribers can unsubscribe themselves" ON public.newsletter_subscribers;
CREATE POLICY "Admins delete subscribers"
  ON public.newsletter_subscribers
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
