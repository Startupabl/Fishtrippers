
-- Booking status enum
CREATE TYPE public.booking_status_t AS ENUM ('pending_offer', 'declined', 'pending_payment', 'confirmed');

-- Add custom_offer to attachment_type enum
ALTER TYPE public.attachment_type_t ADD VALUE IF NOT EXISTS 'custom_offer';

-- bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aide_id uuid NOT NULL,
  learner_id uuid NOT NULL,
  course_id uuid,
  thread_id uuid NOT NULL,
  total_price integer NOT NULL,
  service_fee_amount integer NOT NULL,
  aide_earnings integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.booking_status_t NOT NULL DEFAULT 'pending_offer',
  stripe_checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_learner ON public.bookings(learner_id);
CREATE INDEX idx_bookings_aide ON public.bookings(aide_id);
CREATE INDEX idx_bookings_thread ON public.bookings(thread_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read bookings"
ON public.bookings FOR SELECT TO authenticated
USING (auth.uid() = learner_id OR auth.uid() = aide_id);

CREATE POLICY "Aide creates bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = aide_id AND status = 'pending_offer');

CREATE POLICY "Participants update booking status"
ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = learner_id OR auth.uid() = aide_id);

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- booking_slots table
CREATE TABLE public.booking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 45,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_slots_booking ON public.booking_slots(booking_id);

ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read slots"
ON public.booking_slots FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_slots.booking_id
    AND (b.learner_id = auth.uid() OR b.aide_id = auth.uid())
));

CREATE POLICY "Aide inserts slots while pending"
ON public.booking_slots FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_slots.booking_id
    AND b.aide_id = auth.uid()
    AND b.status = 'pending_offer'
));

CREATE POLICY "Aide deletes slots while pending"
ON public.booking_slots FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_slots.booking_id
    AND b.aide_id = auth.uid()
    AND b.status = 'pending_offer'
));

-- Add booking_id to messages
ALTER TABLE public.messages ADD COLUMN booking_id uuid;
