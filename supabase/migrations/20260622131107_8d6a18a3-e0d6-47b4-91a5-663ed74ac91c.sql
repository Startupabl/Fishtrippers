
ALTER TYPE public.cancellation_dispute_status_t ADD VALUE IF NOT EXISTS 'paid_out';

ALTER TABLE public.cancellation_disputes
  ADD COLUMN IF NOT EXISTS paid_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_out_by uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_details jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_payout_method_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payout_method_check
    CHECK (payout_method IS NULL OR payout_method IN ('ach', 'wallet', 'address'));
