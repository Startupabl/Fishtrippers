ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS about text;
ALTER TABLE public.operators DROP CONSTRAINT IF EXISTS operators_about_length_check;
ALTER TABLE public.operators ADD CONSTRAINT operators_about_length_check
  CHECK (about IS NULL OR char_length(about) <= 1000);