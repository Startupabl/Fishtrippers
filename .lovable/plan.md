## Fix

The Supabase SQL editor only runs SQL, not psql meta-commands. pg_dump 17.9 prepends `\restrict <token>` (line 5) and `\unrestrict <token>` (line 5338) to lock the dump's search_path. Both must be removed.

### Change
Edit `/mnt/documents/migration.sql`:
- Delete line 5: `\restrict ydskrsuX...`
- Delete line 5338: `\unrestrict ydskrsuX...`

No other content changes — the rest of the schema, GRANTs, RLS, functions, triggers, and storage policies stay intact.

### After fix
Re-run the file top-to-bottom in the new project's SQL editor. The post-migration checklist (auth.users triggers, secrets) still applies.