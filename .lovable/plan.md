## Goal

Add an admin-managed Verification column + review modal inside `Admin → Action Dashboard → Listing Applications`, and let admin approve/reject uploaded docs. The captain/guide's "My Verifications" page reflects the new status.

## Changes

### 1. Server functions — `src/lib/admin-verifications.functions.ts` (new)
Admin-gated (`has_role(uid,'admin')`) handlers using `supabaseAdmin`:
- `getVerificationForOwner({ owner_id })` → returns the verifications row for that user (or null).
- `getAdminVerificationDocUrl({ user_id, doc_type })` → signed URL (60s) from the `verification-docs` private bucket so admin can view any user's uploaded files.
- `setVerificationStatus({ user_id, status: 'Verified' | 'Rejected', note? })` → updates `verifications.status`. The existing `sync_operator_verification_status` trigger already syncs `operators.verification_status` (we'll extend it to map `Rejected` → `unverified` so the captain's checklist re-prompts; `Verified` → `verified`).

### 2. Admin Listings table — `src/routes/_admin/admin.queue.tsx`
- Extend `listAdminJourneys` rows (in `src/lib/admin-listings.functions.ts`) to also join verification info per owner: `verification_status` ('Pending Verification' | 'Documents Uploaded' | 'Verified' | 'Rejected' | null) and `verification_user_id`.
- Add new `<TableHead>Verification</TableHead>` between Submitted and Status.
- Cell logic:
  - No row OR status = 'Pending Verification' (no docs) → grey pill **"Not Submitted"**.
  - status = 'Documents Uploaded' → button **"View Docs"** (amber) opens modal.
  - status = 'Verified' → green pill **"Verified"** (still clickable to re-open modal).
  - status = 'Rejected' → red pill **"Rejected"** (clickable).

### 3. Review modal — `src/components/admin/VerificationReviewDialog.tsx` (new)
- Props: `ownerId`, `ownerName`, `open`, `onOpenChange`.
- Loads the owner's verification row via `getVerificationForOwner`.
- Lists the 4 doc slots (ID, License, Insurance, Vessel — last shown only if `is_charter_owner`). Each row: label, helper text, status ("Uploaded" / "Missing"), and **View** button that fetches a signed URL and opens it in a new tab.
- Footer: **Approve** (green) and **Reject** (amber) buttons calling `setVerificationStatus`. Optional note textarea for Reject.
- On success: toast + invalidate `["admin","queue","listings"]` queries so the column refreshes.

### 4. Captain/Guide "My Verifications" page
Already reads `verifications.status` — once admin sets it to `Verified` / `Rejected`, the page reflects it. Add a small status banner at the top:
- `Verified` → green "Your account is verified."
- `Rejected` → red "Your documents were rejected — please re-upload."
- `Documents Uploaded` → blue "Submitted — under review."
- `Pending Verification` → muted "Upload your documents below."

When status is `Rejected`, allow re-upload (resets status to `Documents Uploaded` on next upload via existing `recomputeStatus`, which we'll adjust to clear `Rejected` when the user replaces a file).

### 5. Migration
- Update `recomputeStatus` logic in `upsertVerification` so a re-upload after `Rejected` returns to `Documents Uploaded` (currently it preserves `Rejected`). Pure code change, no SQL.
- Extend trigger `sync_operator_verification_status`: map `Rejected` → `unverified` (so the dashboard "Pending Action Items" re-appears).

## Out of scope
- Admin manually setting the listing status to "Action Required" — the existing Reject Listing flow already handles sending listings back to draft with a note; no new listing status is added.

## Files touched
- New: `src/lib/admin-verifications.functions.ts`, `src/components/admin/VerificationReviewDialog.tsx`
- Edit: `src/lib/admin-listings.functions.ts` (join verification fields), `src/routes/_admin/admin.queue.tsx` (column + modal wiring), `src/lib/verifications.functions.ts` (recompute on re-upload), `src/routes/_authenticated/dashboard.verifications.tsx` (status banner)
- Migration: update `sync_operator_verification_status` trigger.