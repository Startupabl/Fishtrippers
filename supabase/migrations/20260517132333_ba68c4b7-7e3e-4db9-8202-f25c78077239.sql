
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  user_type text NOT NULL CHECK (user_type IN ('learner','aide','visitor')),
  topic text NOT NULL CHECK (topic IN ('general_question','billing_stripe','virtual_classroom_tech','booking_no_show')),
  booking_id text CHECK (booking_id IS NULL OR char_length(booking_id) <= 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','resolved')),
  submitter_id uuid,
  resolved_at timestamptz
);

CREATE INDEX support_tickets_status_created_idx ON public.support_tickets (status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a support ticket"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins read all support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update support tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete support tickets"
ON public.support_tickets
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
