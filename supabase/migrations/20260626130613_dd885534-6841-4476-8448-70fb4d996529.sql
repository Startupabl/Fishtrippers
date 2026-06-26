CREATE OR REPLACE FUNCTION public.sync_operator_verification_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_op_status text;
BEGIN
  IF NEW.status = 'Verified' THEN
    new_op_status := 'verified';
  ELSIF NEW.status = 'Rejected' THEN
    new_op_status := 'unverified';
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
$function$;