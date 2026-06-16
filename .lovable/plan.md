## Goal

Step 2 ("Location / Base of Operations") becomes a Google Places autocomplete on **Primary Meeting Point**. Selecting an address auto-parses city, state, and GPS into the operator record, prefills new trips, and feeds the public listing display.

## Schema

Add to `public.operators` (single migration):

- `default_departure_city text`
- `default_departure_state text` (2-letter region code)
- `default_departure_country text` (ISO-2)
- Index: `operators_default_departure_city_state_idx (default_departure_city, default_departure_state)` for future search filtering.

The address / lat / lng / place_id columns already exist (`default_departure_address`, `default_departure_lat`, `default_departure_lng`, `default_departure_place_id`) — reuse them. No schema changes to `trip_packages`.

The old free-text `operators.location` column stays in the DB for backward compatibility but will be auto-populated as `"City, ST"` on save so existing display code doesn't break. (Deprecated for write from any new UI.)

## Backend

### `src/lib/trips.functions.ts` — `resolvePlace`
Extend the gateway field mask to include `addressComponents`:
- `"id,displayName,formattedAddress,location,addressComponents"`

Parse `addressComponents` and return `city`, `state` (short_name from `administrative_area_level_1`), `country` (short_name) alongside the existing fields.

### `src/lib/operators.functions.ts` — `saveDefaultDeparture`
Extend the inputValidator and update payload to accept and persist `city`, `state`, `country`. Also derive and write `operators.location = "${city}, ${state}"` for back-compat display.

### `src/lib/operators.functions.ts` — `upsertOperatorDraft`
Already writes `operators.location`. Leave intact; ProfileStep will compute `"City, ST"` from the picker selection and pass it as `location` so old reads (preview page, review screen) keep working.

## Onboarding Store (`src/stores/useOperatorOnboardingStore.ts`)

Extend `DefaultDeparture` with `city`, `state`, `country` (all `string | null`). Hydrate from the new operator columns. `isProfileValid` requires `display_name`, `about`, AND `default_departure.address` (replacing the current `location` check).

## ProfileStep (`src/components/operator-onboarding/steps/ProfileStep.tsx`)

Replace the manual `<Input id="location">` block with:

- Label: **"Primary meeting point"** + helper: *"Search for a marina, ramp, or address. We'll use this as the default departure for your trips and show it at the top of your listing."*
- Render `<DeparturePointPicker>` bound to `state.default_departure`.
- On change: update the store via a new `setDefaultDeparture` call (already exists) and also mirror `"City, ST"` into `state.location` so the existing back-compat fields remain in sync.
- Persist on Next/Back via the existing `persistCurrentStep` flow plus a call to `saveDefaultDeparture` (so city/state/lat/lng land on the operator row immediately, not only when a trip is created).

Remove the old `location` form field entirely.

## TripCatalogStep / TripFormDialog
No UI change needed — the dialog already prefills `departure_*` fields from `default_departure`. After ProfileStep persists the default departure, every new trip created in Step 5 starts pre-populated with the same address; captain can override per trip.

## Listing display

`src/routes/_authenticated/operator.preview.tsx` and `src/routes/c.$categorySlug.$listingSlug.tsx`:
- Prefer `op.default_departure_address` (full meeting-point address) at the top of the listing when available, falling back to `op.location` for legacy rows.
- Lat/lng available for future map embed (not added in this pass).

## Out of scope (call out to user)

- Public search filtering by city/state is **not** wired up in this pass — the current `src/routes/search.tsx` filters journeys, not operators. The new city/state columns + index are in place so search-by-location can be added next.
- No map embed on listing pages yet.

## Files touched

- Migration: add 3 columns + index on `public.operators`.
- `src/lib/trips.functions.ts` — `resolvePlace` returns city/state/country.
- `src/lib/operators.functions.ts` — `saveDefaultDeparture` persists city/state/country and back-fills `location`.
- `src/stores/useOperatorOnboardingStore.ts` — extend `DefaultDeparture`, update `isProfileValid`, hydrate new columns.
- `src/components/operator-onboarding/steps/ProfileStep.tsx` — swap text input for `DeparturePointPicker`, mirror `"City, ST"` into `location`, call `saveDefaultDeparture` on persist.
- `src/components/operator-onboarding/trips/DeparturePointPicker.tsx` — pass-through of the new city/state fields from `resolvePlace`.
- `src/routes/_authenticated/operator.preview.tsx` and `src/routes/c.$categorySlug.$listingSlug.tsx` — prefer full meeting-point address in the header.