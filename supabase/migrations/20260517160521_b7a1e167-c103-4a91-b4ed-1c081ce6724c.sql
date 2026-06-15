
-- 1. Column + unique index
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_number_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_number_id_key ON public.profiles(user_number_id);

-- 2. Generator function
CREATE OR REPLACE FUNCTION public.generate_unique_user_number_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
  found INT;
BEGIN
  LOOP
    candidate := lpad((floor(random() * 1000))::int::text, 3, '0')
              || '-' ||
                 lpad((floor(random() * 1000))::int::text, 3, '0');
    SELECT 1 INTO found FROM public.profiles WHERE user_number_id = candidate LIMIT 1;
    IF found IS NULL THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Unable to generate unique user_number_id after 50 attempts';
    END IF;
  END LOOP;
END;
$$;

-- 3. Backfill existing rows
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE user_number_id IS NULL LOOP
    UPDATE public.profiles SET user_number_id = public.generate_unique_user_number_id() WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Enforce NOT NULL going forward
ALTER TABLE public.profiles ALTER COLUMN user_number_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_number_id SET DEFAULT public.generate_unique_user_number_id();

-- 5. Immutable trigger
CREATE OR REPLACE FUNCTION public.prevent_user_number_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.user_number_id IS NOT NULL AND NEW.user_number_id IS DISTINCT FROM OLD.user_number_id THEN
    RAISE EXCEPTION 'user_number_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_user_number_id_immutable ON public.profiles;
CREATE TRIGGER profiles_user_number_id_immutable
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_user_number_id_change();

-- 6. Update handle_new_user to set it on insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, user_status, user_number_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified'::public.user_status_t
         ELSE 'unverified'::public.user_status_t END,
    public.generate_unique_user_number_id()
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
