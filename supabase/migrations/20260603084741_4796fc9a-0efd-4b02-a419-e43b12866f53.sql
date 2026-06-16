-- Seed listing rejection templates (email + onsite alert).
-- Idempotent: upsert on purpose.

-- Email template
INSERT INTO public.email_templates (purpose, display_name, description, subject, body, variables, is_system)
VALUES (
  'listing_rejected_notification',
  'Listing Rejected (Notification)',
  'Sent to an instructor when their course listing is sent back to draft with admin feedback.',
  'Update regarding your FishTrippers listing: {{listing_title}}',
  E'Hi {{user_name}},\n\nThank you for submitting your listing, {{listing_title}}! Our team reviewed your submission and needs a quick update before it can go live:\n\n"{{review_notes}}"\n\nPlease log into your dashboard, click the ''⚠️ Action Needed'' row to address this feedback, and resubmit!',
  ARRAY['user_name','listing_title','review_notes','edit_url'],
  true
)
ON CONFLICT (purpose) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    variables = EXCLUDED.variables,
    updated_at = now();

-- Onsite alert template
INSERT INTO public.alert_templates (purpose, display_name, description, message, variables, is_system)
VALUES (
  'listing_rejected_alert',
  'Listing Rejected (Alert)',
  'Shown in the instructor''s header bell when their listing is sent back to draft.',
  'Your listing ''{{listing_title}}'' needs a quick update before approval.',
  ARRAY['listing_title'],
  true
)
ON CONFLICT (purpose) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    message = EXCLUDED.message,
    variables = EXCLUDED.variables,
    updated_at = now();