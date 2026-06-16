## Changes

### 1. Database migration
Add `min_party_size INT` to `public.trip_packages` (nullable, default 1, check `>= 1`). Itinerary column is left in place (no destructive drop) but stops being written/read by the app.

### 2. Schema — `src/lib/trips.shared.ts`
- Remove `itinerary` from `tripInputSchema`.
- Add `min_party_size: z.number().int().min(1).max(50).default(1)`.
- Add cross-field refine: `min_party_size <= max_party_size`.

### 3. Server fn — `src/lib/trips.functions.ts`
- Stop writing `itinerary` on upsert.
- Write `min_party_size`.
- Include `min_party_size` in select lists.

### 4. Form — `src/components/operator-onboarding/trips/TripFormDialog.tsx`
- Drop the entire Itinerary textarea + state field.
- Rename label "Max party size" → "Max trip size".
- Add "Min trip size" number input next to it (default 1).
- Update total preview copy to "Total at full trip ({max} guests)".
- Update form state defaults + seeding from existing trip.

### 5. Listing card — `src/components/operator-listing/TripsBlock.tsx`
- Remove the collapsible Itinerary section + related state.
- Add two info lines under the price block:
  - "The base price is for 1 person. After that it's {currency} {per_extra} per each additional person per day." (only when `per_extra_minor > 0`)
  - "This trip requires a minimum of {min_party_size} people." (only when `min_party_size > 1`)
- Stepper minimum value = `min_party_size` (default 1).

### 6. My-listing table — `src/routes/_authenticated/dashboard.my-listing.tsx`
- "Party" column shows `{min}–{max}` instead of `1–{max}`.
- Drop the `itinerary` field from the seed object passed into the edit dialog; add `min_party_size`.

## Out of scope
- Public booking flow / Stripe.
- Removing the existing `itinerary` DB column (kept to avoid data loss; can be dropped in a later cleanup migration if desired).
