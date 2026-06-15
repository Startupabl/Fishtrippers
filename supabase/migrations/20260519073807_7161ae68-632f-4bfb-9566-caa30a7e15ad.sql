ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_complete boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_profile_complete = true
WHERE first_name IS NOT NULL
  AND last_name IS NOT NULL
  AND timezone IS NOT NULL
  AND avatar_url IS NOT NULL;