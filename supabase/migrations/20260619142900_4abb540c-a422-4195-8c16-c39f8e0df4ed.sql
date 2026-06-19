ALTER TABLE public.host_availability DROP CONSTRAINT IF EXISTS host_availability_status_check;
ALTER TABLE public.host_availability
  ADD CONSTRAINT host_availability_status_check
  CHECK (status IN ('booked','blocked','held'));