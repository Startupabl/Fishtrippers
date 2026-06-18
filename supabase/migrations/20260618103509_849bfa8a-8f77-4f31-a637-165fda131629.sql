
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmed();

DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
CREATE TRIGGER on_auth_user_signed_in
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_signed_in();

INSERT INTO public.profiles (id, email, first_name, last_name, user_status, user_number_id)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  CASE WHEN u.email_confirmed_at IS NOT NULL THEN 'verified'::public.user_status_t
       ELSE 'unverified'::public.user_status_t END,
  public.generate_unique_user_number_id()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'learner'
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'learner'
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;
