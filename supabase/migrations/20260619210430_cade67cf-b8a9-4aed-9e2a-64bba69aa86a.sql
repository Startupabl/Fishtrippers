ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_topic_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_topic_check CHECK (topic = ANY (ARRAY[
  'general_question'::text,
  'billing_stripe'::text,
  'virtual_classroom_tech'::text,
  'booking_no_show'::text,
  'specific_trip'::text,
  'my_listing'::text,
  'general_questions'::text,
  'technical_issues'::text,
  'other'::text
]));