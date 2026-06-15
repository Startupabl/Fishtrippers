ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS motto text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_motto_length CHECK (motto IS NULL OR char_length(motto) <= 60);