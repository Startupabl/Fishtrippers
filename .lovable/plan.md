## Plan

### 1. Save departure point as default for all trips
Add a "Save as default departure for all trips" checkbox in the `TripFormDialog` departure section. When checked on save, persist the departure (address, lat, lng, place_id) to the operator profile so it auto-fills new trips.

**Backend (migration):**
- Add to `public.operators`:
  - `default_departure_address text`
  - `default_departure_lat double precision`
  - `default_departure_lng double precision`
  - `default_departure_place_id text`

**Onboarding store / data:**
- Extend `useOperatorOnboardingStore` with `defaultDeparture` (hydrated from operator row).
- `getMyOperatorListing` / operator load functions: include new columns.
- A `saveDefaultDeparture` server fn updates the operator row.

**TripFormDialog (`src/components/operator-onboarding/trips/TripFormDialog.tsx`):**
- Add `Checkbox` under `DeparturePointPicker`: "Save as default departure for all my trips".
- On save: if checked, call `saveDefaultDeparture` with current departure values.
- Default the checkbox to checked when no default exists yet (first trip) for convenience.

**TripCatalogStep — new trip seeding:**
- When opening dialog for a new trip and `defaultDeparture` is set, prefill the 4 departure fields instead of empty strings.

### 2. Scroll-to-top on Continue (steps 4, 5, 6)
The Continue button in `src/routes/mentor.create-path.tsx` (`goNext`) advances the step but the page keeps its scroll position, leaving the user at the bottom.

Fix in `goNext` (and `goPrev` for consistency): after `goTo(...)`, call `window.scrollTo({ top: 0, behavior: "auto" })`. Alternatively, scroll the main content container ref to top — using `window` is simplest and works for all steps.

### Out of scope
- Editing existing trips will not retroactively update their departure when the default changes.
- No UI in Profile step to manage the default separately (only set via the trip dialog checkbox for now).

### Files
- New migration adding 4 `default_departure_*` columns to `operators`.
- Edit `src/components/operator-onboarding/trips/TripFormDialog.tsx` (checkbox + save).
- Edit `src/components/operator-onboarding/steps/TripCatalogStep.tsx` (prefill new trip).
- Edit `src/lib/operator-onboarding.functions.ts` (or equivalent) to load/save default departure.
- Edit `src/stores/useOperatorOnboardingStore.ts` to hold `defaultDeparture`.
- Edit `src/routes/mentor.create-path.tsx` — scroll to top in `goNext`/`goPrev`.
