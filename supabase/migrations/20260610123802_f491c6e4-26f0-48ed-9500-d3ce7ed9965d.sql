
-- 1) promo_codes: lock SELECT to owner + admin
DROP POLICY IF EXISTS "Active promo codes authenticated read" ON public.promo_codes;
DROP POLICY IF EXISTS "Owner reads own promo codes" ON public.promo_codes;
CREATE POLICY "Owner reads own promo codes" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR has_role(auth.uid(), 'admin'::app_role));

-- 2) bookings: add WITH CHECK and trigger to prevent financial field tampering
DROP POLICY IF EXISTS "Participants update booking status" ON public.bookings;
CREATE POLICY "Participants update booking status" ON public.bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = learner_id OR auth.uid() = aide_id)
  WITH CHECK (auth.uid() = learner_id OR auth.uid() = aide_id);

CREATE OR REPLACE FUNCTION public.prevent_booking_field_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.total_price        IS DISTINCT FROM OLD.total_price
  OR NEW.aide_earnings      IS DISTINCT FROM OLD.aide_earnings
  OR NEW.service_fee_amount IS DISTINCT FROM OLD.service_fee_amount
  OR NEW.currency           IS DISTINCT FROM OLD.currency
  OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
  OR NEW.learner_id         IS DISTINCT FROM OLD.learner_id
  OR NEW.aide_id            IS DISTINCT FROM OLD.aide_id
  OR NEW.course_id          IS DISTINCT FROM OLD.course_id
  OR NEW.thread_id          IS DISTINCT FROM OLD.thread_id
  OR NEW.class_session_id   IS DISTINCT FROM OLD.class_session_id
  OR NEW.promo_code_id      IS DISTINCT FROM OLD.promo_code_id THEN
    RAISE EXCEPTION 'Not allowed to modify protected booking fields';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_booking_field_tampering() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bookings_prevent_field_tampering ON public.bookings;
CREATE TRIGGER bookings_prevent_field_tampering
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_field_tampering();

-- 3) orders: add WITH CHECK and trigger for financial field protection
DROP POLICY IF EXISTS "Learner updates own orders" ON public.orders;
CREATE POLICY "Learner updates own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = learner_id)
  WITH CHECK (auth.uid() = learner_id);

DROP POLICY IF EXISTS "Mentor updates orders" ON public.orders;
CREATE POLICY "Mentor updates orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

CREATE OR REPLACE FUNCTION public.prevent_order_field_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR auth.uid() IS NULL
     OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.total_paid_minor   IS DISTINCT FROM OLD.total_paid_minor
  OR NEW.aide_payout_minor  IS DISTINCT FROM OLD.aide_payout_minor
  OR NEW.platform_fee_minor IS DISTINCT FROM OLD.platform_fee_minor
  OR NEW.learner_id         IS DISTINCT FROM OLD.learner_id
  OR NEW.mentor_id          IS DISTINCT FROM OLD.mentor_id
  OR NEW.order_number       IS DISTINCT FROM OLD.order_number THEN
    RAISE EXCEPTION 'Not allowed to modify protected order fields';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.prevent_order_field_tampering() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_prevent_field_tampering ON public.orders;
CREATE TRIGGER orders_prevent_field_tampering
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_order_field_tampering();

-- 4) storage: scope message-attachments SELECT to authenticated only
DROP POLICY IF EXISTS "Message attachments participants read" ON storage.objects;
CREATE POLICY "Message attachments participants read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE (t.id)::text = (storage.foldername(objects.name))[1]
        AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid())
    )
  );

-- 5) Revoke EXECUTE on SECURITY DEFINER helpers that should not be called from the API
REVOKE EXECUTE ON FUNCTION public.handle_email_confirmed()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_signed_in()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_purge_unused_custom_tags()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_unused_custom_tags()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_unknown_tags()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.merge_tags(uuid, uuid[])       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_class_session_seats(uuid) FROM PUBLIC, anon, authenticated;
-- has_role stays callable by authenticated (used inside RLS policies of other tables).
