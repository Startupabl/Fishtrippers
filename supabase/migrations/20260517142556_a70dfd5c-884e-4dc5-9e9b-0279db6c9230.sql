ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE public.profiles RENAME COLUMN state_region TO state_province;
ALTER TABLE public.profiles RENAME COLUMN zip_code TO postal_code;