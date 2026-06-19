ALTER TABLE public.bookings ALTER COLUMN thread_id DROP NOT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS primary_angler_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_minor integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS balance_due_minor integer;