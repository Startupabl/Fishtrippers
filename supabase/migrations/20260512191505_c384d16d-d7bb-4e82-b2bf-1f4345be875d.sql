ALTER TABLE public.journeys
  ALTER COLUMN course_id_slug SET DEFAULT public.next_course_id_slug();