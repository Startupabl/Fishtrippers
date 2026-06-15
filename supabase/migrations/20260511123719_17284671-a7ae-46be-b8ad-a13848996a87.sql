DROP POLICY "Anyone can subscribe to the newsletter" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe with a valid email"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);