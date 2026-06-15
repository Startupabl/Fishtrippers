## Goal
Make `cruz.collective.llc@gmail.com` a working admin user.

## Steps
1. Insert a `public.profiles` row for user id `62980201-9c67-4a81-a92c-87f2bece2677` (email, verified status, auto-generated `user_number_id`).
2. Insert `('admin')` into `public.user_roles` for the same user id (also keep `'learner'` so they have full app access too).
3. Verify with a SELECT that both rows exist and `has_role(uid, 'admin')` returns true.

## Out of scope
- Not fixing the missing `on_auth_user_created` trigger right now (separate issue — future signups won't auto-create profiles until it's added). Happy to do that next if you want.
