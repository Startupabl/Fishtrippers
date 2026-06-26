## My Verifications — Step 2

Build the verifications table, storage bucket, and the upload page.

### 1. Database

New table `public.verifications`:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null unique references auth.users on delete cascade`
- `is_charter_owner boolean not null default false`
- `id_url text`, `license_url text`, `insurance_url text`, `vessel_doc_url text` (storage paths, not public URLs)
- `status text not null default 'Pending Verification' check (status in ('Pending Verification','Documents Uploaded','Verified','Rejected'))`
- `created_at`, `updated_at` with update trigger

Grants + RLS:
- `GRANT SELECT, INSERT, UPDATE ON public.verifications TO authenticated; GRANT ALL TO service_role;`
- Policies:
  - User can select/insert/update their own row (`auth.uid() = user_id`)
  - Admins can select/update all (`has_role(auth.uid(), 'admin')`)

Keep the existing `operators.verification_status` column as the source for the "Verified" badge / Pending Action Items checklist. Add a trigger (or handle in the server fn) to sync: when `verifications.status` flips to `'Verified'`, set the user's `operators.verification_status = 'verified'`; when set back to anything else, set it to `'pending'` (if any docs uploaded) or `'unverified'`.

### 2. Storage

New **private** bucket `verification-docs` (created via the bucket tool).
- Path convention: `{user_id}/{doc_type}.{ext}` so re-upload overwrites the same key (`upsert: true`).
- RLS policies on `storage.objects`:
  - Owner can `select/insert/update/delete` where `bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]`
  - Admins can `select` all rows in this bucket
- Accept: PDF, JPG, PNG, max 10 MB (client-side validation).
- Reads use short-lived signed URLs (60s), same pattern as `message-attachment-upload.ts`.

### 3. Server functions

New file `src/lib/verifications.functions.ts`:
- `getMyVerification()` — `requireSupabaseAuth`; returns the user's row (or null).
- `upsertVerification({ is_charter_owner, doc_type?, storage_path? })` — upsert row, set the matching `*_url` column, and recompute `status`:
  - `'Documents Uploaded'` once all required docs present (id+license+insurance, plus vessel if `is_charter_owner`)
  - else `'Pending Verification'`
  - never overwrite `'Verified'` / `'Rejected'` from the user side
- `getVerificationDocSignedUrl({ doc_type })` — owner or admin only.

Client upload helper `src/lib/verification-upload.ts` mirroring existing upload helpers (validate, upload with `upsert: true`, return the storage path).

### 4. UI — `src/routes/_authenticated/dashboard.verifications.tsx`

Replace the current stub with the real page:

- Header: **"Please upload the following to verify your account:"** + short sub-line.
- Status pill at top showing current `status`.
- Role row: switch / radio **"Are you a Charter Boat Owner?"** — persists immediately on toggle; controls whether the Vessel field is required and shown.
- Four upload cards (Identity, License, Insurance, Vessel — Vessel hidden/optional unless charter owner is on):
  - Title + "Required" badge
  - Upload button (file picker). If a file exists: button label becomes **"Replace file"** and a green **"File uploaded"** indicator + "View" link (opens signed URL) appears; otherwise grey **"No file"** indicator.
  - Muted helper text directly beneath the button:
    - Identity: *"Passport, Driver's License, or Government ID."*
    - License: *"State/Region fishing guide license or marine certificate."*
    - Insurance: *"Commercial liability insurance certificate."*
    - Vessel: *"Vessel registration or Certificate of Survey."*
- Toasts on success/error, query invalidation on upload so Pending Action Items checklist on My Listing auto-clears when status reaches `'Verified'` (admin-driven, step 3 of overall plan).

### Out of scope (next step)
- Admin review screen to approve/reject submissions (flips status to `'Verified'`/`'Rejected'` and triggers the operator sync).
