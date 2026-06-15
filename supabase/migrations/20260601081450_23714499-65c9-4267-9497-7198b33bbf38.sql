-- Email templates manager
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  subject text NOT NULL,
  body text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read email templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update email templates"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 10 core transactional templates
INSERT INTO public.email_templates (purpose, display_name, description, subject, body, variables) VALUES
('welcome_user', 'Welcome Email', 'Sent when a new user completes signup.', 'Welcome to Lumin, {{first_name}}!',
'Hi {{first_name}},

Welcome to Lumin! We''re thrilled to have you join our community of curious learners.

Start exploring courses and connect with expert instructors today:
{{app_url}}

— The Lumin Team',
ARRAY['first_name','app_url']),

('email_verification', 'Email Verification', 'Sent to confirm a user''s email address.', 'Verify your email address',
'Hi {{first_name}},

Please confirm your email address by clicking the link below:

{{verification_url}}

This link will expire in 24 hours.',
ARRAY['first_name','verification_url']),

('password_reset', 'Password Reset', 'Sent when a user requests a password reset.', 'Reset your Lumin password',
'Hi {{first_name}},

We received a request to reset your password. Click the link below to choose a new one:

{{reset_url}}

If you didn''t request this, you can safely ignore this email.',
ARRAY['first_name','reset_url']),

('magic_link', 'Magic Sign-in Link', 'Passwordless sign-in link.', 'Your Lumin sign-in link',
'Click the link below to sign in to Lumin:

{{magic_link}}

This link expires in 15 minutes.',
ARRAY['magic_link']),

('new_chat_message', 'New Chat Message', 'Notifies a user when they receive a new direct message.', 'New message from {{sender_name}}',
'Hi {{recipient_first_name}},

You have a new message from {{sender_name}}.

Read and reply here:
{{thread_url}}',
ARRAY['recipient_first_name','sender_name','thread_url']),

('custom_offer_received', 'Custom Offer Received', 'Sent to a learner when an instructor sends them a custom offer.', 'New custom offer from {{aide_name}}',
'Hi {{learner_first_name}},

{{aide_name}} sent you a custom offer for "{{course_title}}".

Review and accept it here:
{{offer_url}}',
ARRAY['learner_first_name','aide_name','course_title','offer_url']),

('booking_confirmed_aide', 'Booking Confirmed (Instructor)', 'Sent to the instructor when a learner confirms and pays for a booking.', 'New student booking confirmed for "{{course_title}}"',
'Hi {{aide_first_name}},

Great news — {{learner_name}} just booked a seat in "{{course_title}}"!

Check your schedule and updated roster:
{{schedule_url}}',
ARRAY['aide_first_name','learner_name','course_title','schedule_url']),

('booking_confirmed_learner', 'Booking Confirmed (Learner)', 'Sent to the learner after a successful booking payment.', 'Your booking for "{{course_title}}" is confirmed',
'Hi {{learner_first_name}},

Your seat in "{{course_title}}" is officially reserved. We can''t wait for you to get started!

View your schedule:
{{schedule_url}}',
ARRAY['learner_first_name','course_title','schedule_url']),

('listing_approved', 'Listing Approved', 'Sent to an instructor when their course listing is approved.', 'Your listing "{{course_title}}" is now live',
'Hi {{aide_first_name}},

Your listing "{{course_title}}" has been approved and is now live on Lumin!

View your listing:
{{listing_url}}',
ARRAY['aide_first_name','course_title','listing_url']),

('payout_sent', 'Payout Sent', 'Sent to an instructor when a payout has been processed.', 'Your payout of {{amount}} is on the way',
'Hi {{aide_first_name}},

A payout of {{amount}} was sent to your bank account on {{payout_date}}.

Thank you for teaching on Lumin!',
ARRAY['aide_first_name','amount','payout_date']);
