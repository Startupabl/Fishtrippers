## Goal

Surface the full new trip data model (start time, target species, environments, techniques, departure, party-size pricing) wherever trips are shown today — the **My Listing dashboard table** and the **Operator Preview page (`/operator/preview`)** — and upgrade the preview's `TripsBlock` into a real guest-facing trip detail UI with a guests selector, total calculation, and FX currency disclaimer.

> Note: there is no separate `/c/...` public operator detail route yet — `operator.preview.tsx` is the canonical render of the public listing. Building a brand-new public route is out of scope for this turn.

## Scope

### 1. Rich `TripsBlock` in operator preview — `src/components/operator-listing/TripsBlock.tsx`

Rewrite the card so each trip shows everything the model now carries:

- **Header row**: title, start time (e.g. "Departs 6:00 AM"), duration pill, environments + techniques chips.
- **Description** with line-break preservation (plain textarea content).
- **Target species** mini row (chips, reuses species labels).
- **Departure**: pin icon + `departure_address`.
- **Price block** (right side, sticky on desktop):
  - Base price (1 person) in trip currency, converted to viewer currency via existing `useFormattedPrice`/`convertMinor`.
  - "+ {per_extra} per extra guest" line when `per_extra_minor > 0`.
  - **Guests selector** (1 → `max_party_size`) using a small number stepper.
  - **Live total** = `price_minor + per_extra_minor * (guests - 1)`, formatted in viewer currency.
  - **Currency disclaimer** shown only when viewer currency ≠ trip `currency`: small muted text — *"Prices shown in {DISPLAY} are converted from {BASE} at today's ECB rate. Final charge will be in {BASE}."*
  - Primary "Request to book" button (visual only — booking flow stays unchanged).
- **Itinerary** in a collapsible "Trip itinerary" disclosure (rendered with `whitespace-pre-line`) when present.

Update the `Trip` interface inside the file to include the new fields (`start_time`, `per_extra_minor`, `max_party_size`, `target_species`, `environments`, `techniques`, `itinerary`, `departure_address`).

### 2. Pass full trip rows into `TripsBlock`

`getMyOperatorListing` already returns `*` from `trip_packages`, so all fields flow through. Just remove any narrow typing at the call site in `operator.preview.tsx` (the cast already exists, just confirm `trips as any` stays compatible) — no server-fn changes needed.

### 3. My Listing table — `src/routes/_authenticated/dashboard.my-listing.tsx`

Add two columns and surface the new fields in the row:

- **Start time** (after Title) — formatted `HH:MM` or "—".
- **Party** — `1–{max_party_size}` with `(+{per_extra}/person)` muted suffix when set.
- Existing **Price** cell stays but adds " base" suffix when `per_extra_minor > 0`.
- Existing **Departure** cell keeps truncation.

No schema or server-fn changes — these fields are already loaded by `listMyTrips`.

### 4. Currency disclaimer helper (small, reusable)

Add a tiny presentational component `src/components/operator-listing/CurrencyDisclaimer.tsx` that takes `{ baseCurrency, displayCurrency }` and renders the muted disclaimer only when the codes differ. Used by `TripsBlock` and ready to drop into a future standalone trip-detail page.

## Out of scope

- New public `/operator/$slug` route or `/trip/$id` route.
- Booking flow / Stripe checkout wiring for trips (still uses existing journey path).
- DB or `trip_packages` schema changes — model is already complete.
- Operator wizard step changes.

## Files

- edit `src/components/operator-listing/TripsBlock.tsx`
- create `src/components/operator-listing/CurrencyDisclaimer.tsx`
- edit `src/routes/_authenticated/dashboard.my-listing.tsx`
- (no edits expected in `operator.preview.tsx`, `trips.functions.ts`, or `operator-listing.functions.ts`)