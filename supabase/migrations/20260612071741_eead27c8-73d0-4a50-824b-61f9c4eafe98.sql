
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

INSERT INTO public.email_templates (purpose, display_name, description, subject, body, variables, is_system)
VALUES (
  'urgent_message',
  'Urgent Message',
  'Sent when a user marks a chat message as urgent. Includes a short snippet and a link to the thread.',
  '🚨 Urgent message from {{sender_name}}',
  E'Hi {{recipient_first_name}},\n\n{{sender_name}} has marked this message as urgent.\n\n"{{snippet}}"\n\nView the full conversation:\n{{thread_url}}',
  ARRAY['recipient_first_name','sender_name','snippet','thread_url'],
  true
)
ON CONFLICT (purpose) DO NOTHING;
