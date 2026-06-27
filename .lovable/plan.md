## Fix

The `pg_dump` header sets `search_path = ''`, so any unqualified reference to `app_role` or `has_role()` fails with "type does not exist". The earlier policies were correctly schema-qualified (`public.app_role`, `public.has_role`), but four storage policies at the end of `migration.sql` were not.

Patch `/mnt/documents/migration.sql`:

- Line 5346 — `Admins delete category images`
- Line 5348 — `Admins update category images`
- Line 5350 — `Admins upload category images`
- Line 5400 — `verification-docs owner read`

In each, replace `has_role(...)` with `public.has_role(...)` and `'admin'::app_role` with `'admin'::public.app_role`.

Then re-export the file for download. No other changes required.