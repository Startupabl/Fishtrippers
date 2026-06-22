
CREATE TYPE public.cancellation_dispute_status_t AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE public.cancellation_dispute_type_t AS ENUM ('policy_payout', 'other');

CREATE TABLE public.cancellation_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  captain_id uuid NOT NULL,
  claim_type public.cancellation_dispute_type_t NOT NULL,
  captain_details text NOT NULL CHECK (char_length(captain_details) <= 250),
  status public.cancellation_dispute_status_t NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cancellation_disputes_booking ON public.cancellation_disputes(booking_id);
CREATE INDEX idx_cancellation_disputes_captain ON public.cancellation_disputes(captain_id);
CREATE INDEX idx_cancellation_disputes_status ON public.cancellation_disputes(status);

GRANT SELECT, INSERT ON public.cancellation_disputes TO authenticated;
GRANT ALL ON public.cancellation_disputes TO service_role;

ALTER TABLE public.cancellation_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captains insert their own disputes"
  ON public.cancellation_disputes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Captains read their own disputes"
  ON public.cancellation_disputes
  FOR SELECT TO authenticated
  USING (auth.uid() = captain_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_cancellation_disputes_updated_at
  BEFORE UPDATE ON public.cancellation_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
