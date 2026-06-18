## Why the trip isn't showing

Your trip "Full Day Trip" exists in the database but its `status` is `draft`. The public listing page (`/charters/.../...`) only renders trips with `status = 'active'`, so visitors (and you when logged in as a non-owner) don't see it.

The trip status enum supports: `draft`, `active`, `archived`. New trips currently default to `draft`, and there's no UI yet for the owner to publish/activate a trip — so every trip stays hidden from the public.

## Fix

1. **`src/lib/trips.functions.ts`** — extend `upsertTrip` to accept an optional `status` field (`'draft' | 'active'`) and persist it on insert/update. Also add a small `setTripStatus({ id, status })` server function so the dashboard can toggle publish without re-submitting the whole form.

2. **`src/lib/trips.shared.ts`** — add `status` to the Zod input schema (optional, defaults to `'draft'` on create; on update preserves existing).

3. **Owner trips dashboard** (the page that lists/edits trips under `_authenticated`) — for each trip row, show its status as a badge and add a primary action:
   - If `draft` → "Publish" button → calls `setTripStatus({ status: 'active' })`.
   - If `active` → "Unpublish" button → sets back to `draft`.
   After success, invalidate the trips query so the badge updates.

4. **One-off fix for your existing trip** — flip the current `Full Day Trip` row from `draft` to `active` via a migration so it appears immediately on the public listing without you needing to click publish first.

5. No RLS or public-fetch changes needed — `operator-public.functions.ts` already correctly filters to `status='active'`.

## Out of scope

- No changes to the create-listing flow itself.
- No changes to public listing fetch logic.
- No archive UI in this pass (status enum supports it but we'll leave it for later).
