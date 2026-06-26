## Goal

Make the trip pricing section in `TripFormDialog.tsx` react to **Private Charter** vs **Shared Tour** so charter captains enter one flat boat rate instead of a base-plus-additional split. Guides and shared trips stay unchanged.

## Changes (single file: `src/components/operator-onboarding/trips/TripFormDialog.tsx`)

### 1. Pricing inputs (Private Charter only)

- Rename the base price label from "Base price (1st angler)" to **"Base Price (Entire Boat)"**.
- Helper text under the input: **"Total Trip Price (Private Boat)"** with subtext: *"The total trip price for booking this charter boat with a max party size of {max_party_size} guests."* — `{max_party_size}` is pulled live from `form.max_party_size` (fallback "your max" when empty).
- Hide the "Price per additional angler" input entirely for Private Charter (already hidden today for shared; we extend the hide to all private-charter cases).
- Guide "Private Trip" keeps the existing base + per-additional pair (only `private_charter` is affected, per the spec which references Charter ops).

### 2. State / data handling

- When switching to `private_charter`, force `per_extra_minor = 0` and clear the `extraInput` field so stale additional-angler data is never persisted.
- Update the trip-type select handler (lines ~292-303) so the "private" branch zeroes `per_extra_minor` (today it only zeros it on the shared branch).
- `price_minor` continues to be the saved field — it now represents the flat boat rate for Private Charter. No DB schema change needed; `per_extra_minor` stays 0 for these rows, so existing booking math (`price_minor + extras * per_extra_minor`) still resolves to the flat boat price.

### 3. Total preview

- Update the "Total Trip Price (Full Boat)" preview block so for Private Charter it shows `price_minor` directly (no addition), with subtext: *"Flat rate for the entire boat (up to {max_party_size} guests)."* Shared/Guide-Private branches unchanged.

## Out of scope

- Database schema (no new `flat_boat_rate` column — `price_minor` already serves this role and avoids a migration + booking/search refactor across `operators-search.functions.ts`, `trip-bookings.functions.ts`, and `booking.checkout.tsx`).
- Guide trip types, shared trip seat logic, and search-card pricing display.