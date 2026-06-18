## Diagnosis

Bam's row exists in `auth.users` with `raw_user_meta_data.first_name = "Bam"`, but there is **no matching row in `public.profiles`**. Cause: the `handle_new_user` function is defined in the database, but the trigger on `auth.users` that should call it does not exist (no triggers in the project at all). So profile rows are never created on signup, and the settings page reads back nothing.

Three related auth triggers are also missing and should be wired up at the same time:
- `handle_new_user` → create profile + assign `learner` role on signup
- `handle_email_confirmed` → flip `user_status` from `unverified` to `verified` when email is confirmed
- `handle_user_signed_in` → bump `profiles.login_count` on each sign-in

## Plan

### 1. Migration: install the three missing triggers on `auth.users`

```sql
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
```

### 2. Backfill profile rows for any existing auth users that are missing one (Bam + anyone else)

```sql
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
```

### 3. Verify after migration

- Re-query `public.profiles` — Bam's row should now exist with `first_name = 'Bam'`.
- Sign up a fresh test account → new profile row appears automatically.
- Refresh `/settings/profile` while signed in as Bam → first name pre-fills.

No application code changes are required; the existing `handle_new_user` function already reads `raw_user_meta_data ->> 'first_name'`, which the register form already sets.
