### Fix malformed storage.objects policy in migration.sql

The user received this Supabase error while running `migration.sql`:
```
ERROR:  42601: syntax error at or near "%"
LINE 5346: CREATE POLICY %I ON storage.objects FOR Admins delete category imagesdelete TO authenticated USING ...
```

A `storage.objects` policy was mangled during export. The `%I` placeholder and the policy name were inserted into the SQL statement incorrectly, producing an invalid mix of `FOR Admins delete category imagesdelete` instead of a proper `FOR DELETE` clause.

**What I will do:**
1. Open `migration.sql` and locate the malformed policy around line 5346.
2. Replace the broken line with a correct policy definition:
   ```sql
   CREATE POLICY "Admins delete category images" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'category-images'::text) AND has_role(auth.uid(), 'admin'::app_role)));
   ```
3. Search the rest of `migration.sql` for other occurrences of `%I` or similar malformed `storage.objects` policy syntax (e.g., `FOR Admins ... delete` or `FOR %I ...` patterns) and fix any matching lines.
4. Verify the generated file still contains the rest of the schema intact (no accidental large deletions).

**Out of scope:**
- No database changes will be made via Supabase migration tools — this is a standalone export file.
- No changes to application code or the live database.

**Result:** A clean `migration.sql` that can be imported into the user's new external Supabase project without the syntax error.