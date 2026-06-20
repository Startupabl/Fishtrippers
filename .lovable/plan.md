
## Goals

1. Clicking **Edit listing** anywhere in the dashboard should open the multi-step form at **Step 1**, not the read-only preview page.
2. Saving any step (especially Step 2 — Profile) must persist that step's data without silently wiping data from other steps.

## Diagnosis

### Bug 1 — "Edit listing" lands on preview page
In `src/routes/_authenticated/dashboard.my-listing.tsx` every "Edit listing" link points to `/operator/preview?edit=true` (lines 265, 396, 437). The preview route is a read-only listing view with a single "Save updates" button — there is no Step 1/2/3 navigation there. The wizard lives at `/create-listing/new`.

### Bug 2 — Profile data appears not to save
Two persist call sites build a partial operator payload:

- `persistCurrentStep` in `src/routes/create-listing.new.tsx` (≈ line 138)
- `handleSaveUpdates` in `src/routes/_authenticated/operator.preview.tsx` (≈ line 88)

Both payloads omit `fishing_environments` and `base_currency`. The server handler `upsertOperatorDraft` in `src/lib/operators.functions.ts` (line 61) then does:

```
fishing_environments: data.operator.fishing_environments ?? [],
```

Because the field is `undefined` in the payload, it is **overwritten with `[]` on every save**. The wizard advances Step 2 → 3 by calling `persistCurrentStep`, which silently clears the fishing-focus selections the user made earlier when they revisit. From the user's perspective, when they come back to the form, fields look blank / out of sync, and the Continue button on Step 2 can appear to "do nothing" because the operator row is saved with values that don't match the local store after the next hydrate.

A secondary risk: the avatar upload in Step 2 writes to `profiles.avatar_url` but the listing's `cover_image_url` is sourced from `operator_photos` (gallery), so there is no avatar-save bug — only the operator-row wipe is the real issue.

## Plan

### 1. Route the "Edit listing" buttons to Step 1 of the wizard

File: `src/routes/_authenticated/dashboard.my-listing.tsx`

Change all three `<Link to="/operator/preview" search={{ edit: true }}>` "Edit listing" buttons to:

```
<Link to="/create-listing/new" search={{ edit: true }}>
```

Leave the plain "View preview" / "Preview" links pointing at `/operator/preview` (they have no `edit` search param) unchanged.

Also, when the wizard finishes Step 6 in edit mode, it currently sends the user to `/operator/preview?edit=true`. Keep that — once they finish all steps, landing on the preview to confirm and save is the right ending.

### 2. Stop the server from wiping fields the client didn't send

File: `src/lib/operators.functions.ts`

Change `upsertOperatorDraft` to build the operator payload by **only including keys the client explicitly sent** (treat `undefined` as "don't touch", but allow `null` as an explicit clear). Concretely, replace the flat object literal with a builder that adds each key only when `data.operator.<key> !== undefined`. This makes step-by-step partial saves safe and matches how the UI already thinks about saving.

Apply the same partial-update rule to the vessel payload for charters (don't overwrite `features` with `{}` when the client didn't send `vessel`).

### 3. Make the two client save sites send every field the store knows about

So that no field silently flips to `null`/`[]` on save, update both:

- `persistCurrentStep` in `src/routes/create-listing.new.tsx`
- `handleSaveUpdates` in `src/routes/_authenticated/operator.preview.tsx`

…to also include `fishing_environments: state.fishing_environments ?? []` and `base_currency: state.base_currency ?? "USD"` in the operator payload. With change #2 above this is belt-and-braces, but it removes a class of regressions if the server handler is ever simplified.

### 4. Verify

Manually walk through, in this order, on a charter account that already has a listing:

1. Dashboard → click **Edit listing** → expect URL `/create-listing/new?edit=true` and Step 1 (Business type) selected.
2. Step 2 (Profile): edit Display Name, Meeting Point, About → click **Continue** → return to Step 2 → fields persist.
3. Step 4 (Fishing focus): pick environments + species → Continue → Step 5 → go back to Step 4 → selections persist.
4. Step 6 (Booking rules): set all 3 fields → Continue → lands on `/operator/preview?edit=true`.
5. On preview, click **Save updates** → toast success; refresh; data persists.

If any step regresses, capture the failing payload from the network panel and adjust the partial-update guard in step 2.

## Out of scope

- No schema changes.
- No changes to the avatar upload, the gallery uploader, or the trip catalog modal.
- No changes to the preview page's layout — only the Edit-button targets and the save helper's payload shape.
