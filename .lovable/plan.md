## Problem

On a public charter listing page, when the captain has no published trips, the entire **"Trip availability and prices"** section currently renders an empty-state card that says *"No trips added yet — Add your first trip so guests can book"* with a button to `/dashboard/my-listing`. This is useful to the listing owner, but confusing/inappropriate for public visitors who can't add trips.

## Fix

Make the `TripsBlock` component hide the whole section when:
- there are no published trips, **and**
- the current viewer is **not** the listing owner.

For the listing owner (and in the authenticated preview page), the empty state stays exactly the same so they can still add trips.

## Changes

1. **`src/components/operator-listing/TripsBlock.tsx`**
   - Accept a new optional prop: `ownerId?: string | null`.
   - Read current user from `useAuthStore`.
   - If `trips.length === 0`, `ownerId` is provided, and the current user is not the owner, return `null` (hide the section entirely).
   - Otherwise preserve existing behavior.

2. **`src/routes/charters.$location.$businessSlug.tsx`**
   - Pass `operator.owner_id` to `<TripsBlock ownerId={op?.owner_id ?? null} />` so the ownership check can run on public pages.

3. **`src/routes/_authenticated/operator.preview.tsx`** (no change needed)
   - Leave the preview route as-is; it will not pass `ownerId`, so the empty state remains visible for the owner in preview.

## Outcome

- Public visitors looking at a listing with no published trips will not see the Trips section at all.
- The listing owner viewing their own public page will still see the "Add a trip" empty state.
- The authenticated `/operator/preview` page remains unchanged.