
CREATE POLICY "Mentors read own reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = aide_id);

DROP POLICY IF EXISTS "Anyone can submit a listing report" ON public.reported_listings;
CREATE POLICY "Anyone can submit a listing report"
  ON public.reported_listings FOR INSERT TO anon, authenticated
  WITH CHECK (
    listing_id IS NOT NULL
    AND reason_category IS NOT NULL
    AND char_length(coalesce(custom_details, '')) <= 1000
    AND (reporter_id IS NULL OR reporter_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can submit a support ticket" ON public.support_tickets;
CREATE POLICY "Anyone can submit a support ticket"
  ON public.support_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL AND char_length(full_name) BETWEEN 1 AND 200
    AND email IS NOT NULL AND char_length(email) BETWEEN 3 AND 320
    AND topic IS NOT NULL AND char_length(topic) BETWEEN 1 AND 200
    AND message IS NOT NULL AND char_length(message) BETWEEN 1 AND 5000
    AND (submitter_id IS NULL OR submitter_id = auth.uid())
  );

REVOKE EXECUTE ON FUNCTION public.increment_class_session_seats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_class_session_seats(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_class_session_seats(uuid) TO service_role;
