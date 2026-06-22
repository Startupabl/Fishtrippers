
ALTER TYPE public.booking_status_t ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS angler_written_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_timestamp timestamptz;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_angler_written_reason_len_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_angler_written_reason_len_chk
  CHECK (angler_written_reason IS NULL OR char_length(angler_written_reason) <= 100);

GRANT UPDATE (status, angler_written_reason, cancellation_timestamp) ON public.bookings TO authenticated;
