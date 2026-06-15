CREATE TABLE public.alert_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  message text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.alert_templates TO authenticated;
GRANT ALL ON public.alert_templates TO service_role;

ALTER TABLE public.alert_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read alert templates" ON public.alert_templates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update alert templates" ON public.alert_templates
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_alert_templates_updated_at
  BEFORE UPDATE ON public.alert_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.alert_templates (purpose, display_name, description, message, variables) VALUES
  ('booking_confirmed', 'New Booking (Instructor)', 'Shown in the instructor''s header bell when a learner books their course.', 'New student booking confirmed for "{{course_title}}"! Check your schedule to view your updated roster.', ARRAY['course_title']),
  ('new_message', 'New Direct Message', 'Shown when a user receives a new chat message.', 'New message from {{sender_name}}.', ARRAY['sender_name']),
  ('listing_approved', 'Listing Approved', 'Shown to an instructor when their listing is approved.', 'Your listing "{{course_title}}" is now live!', ARRAY['course_title']),
  ('custom_offer_received', 'Custom Offer Received', 'Shown to a learner when they receive a custom offer.', '{{aide_name}} sent you a custom offer for "{{course_title}}".', ARRAY['aide_name','course_title']),
  ('payout_sent', 'Payout Sent', 'Shown to an instructor when a payout is processed.', 'Payout of {{amount}} sent to your bank account.', ARRAY['amount']),
  ('booking_confirmed_learner', 'Booking Confirmed (Learner)', 'Shown to a learner after a successful booking.', 'Your booking for "{{course_title}}" is confirmed!', ARRAY['course_title']);