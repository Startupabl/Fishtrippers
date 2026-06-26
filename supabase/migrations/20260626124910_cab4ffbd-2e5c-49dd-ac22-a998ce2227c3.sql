
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_charter_owner boolean NOT NULL DEFAULT false,
  id_url text,
  license_url text,
  insurance_url text,
  vessel_doc_url text,
  status text NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Pending Verification','Documents Uploaded','Verified','Rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own verification" ON public.verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own verification" ON public.verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own verification" ON public.verifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER verifications_updated_at BEFORE UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync verifications.status -> operators.verification_status
CREATE OR REPLACE FUNCTION public.sync_operator_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_op_status text;
BEGIN
  IF NEW.status = 'Verified' THEN
    new_op_status := 'verified';
  ELSIF NEW.id_url IS NOT NULL OR NEW.license_url IS NOT NULL OR NEW.insurance_url IS NOT NULL OR NEW.vessel_doc_url IS NOT NULL THEN
    new_op_status := 'pending';
  ELSE
    new_op_status := 'unverified';
  END IF;

  UPDATE public.operators
    SET verification_status = new_op_status
    WHERE owner_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER verifications_sync_operator
  AFTER INSERT OR UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_operator_verification_status();
