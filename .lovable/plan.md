# Step 5: Trip Catalog + Per-Step Persistence

## 1. Database changes (one migration)

Extend `public.trip_packages` so trips can carry a departure point and remember which template seeded them:

- `departure_address text` — human-readable formatted address from Maps
- `departure_lat double precision`
- `departure_lng double precision`
- `departure_place_id text` — Google Place ID (optional, for re-render)
- `template_key text` — e.g. `offshore_half_day`, or `null` for custom
- Index on `(operator_id, status)` for the dashboard list

No new tables, no RLS changes — existing "Owners manage own trip packages" policy already covers it.

## 2. Server functions (`src/lib/trips.functions.ts`)

All authenticated via `requireSupabaseAuth`, scoped to the caller's operator row:

- `listMyTrips()` — returns trips for the caller's operator, ordered by `created_at`
- `upsertTrip(input)` — create or update one trip; validates duration > 0, price ≥ 0, required title; resolves `operator_id` from `owner_id`
- `deleteTrip({ id })`

Shared Zod schema in `src/lib/trips.shared.ts` with `TRIP_TEMPLATES` keyed by primary category:

```
offshore:    Half-Day Deep Sea / Full-Day Big Game / Overnight Swordfish Trip
inshore:     4-Hour Flats Trip / 6-Hour Bay Exploration / Sight Casting Specialist
freshwater:  Morning Bass Run / Full-Day Lake Tournament / River Float Trip
fly:         Fly Fishing Fundamentals / Saltwater Fly Sight-Casting / Trout Stream Expedition
```

Each template carries a sensible default duration (minutes) and price hint, but only `title` is pre-filled in the form (per spec — Duration and Price are required inputs).

## 3. Per-step auto-save (addresses "save to DB, not just screen")

Today the draft only writes to Postgres on final submit. Change `mentor.create-path.tsx` so the `advance()` handler calls `upsertOperatorDraft` for the step the user just finished, then moves forward only on success. The store still hydrates from server on load (already wired), so a refresh mid-flow restores progress.

- `business_type` step → save `business_type`
- `profile` → save `display_name`, `location` (+ profile image upload already lives in ProfileStep)
- `boat_details` → save vessel (charter only)
- `fishing_focus` → save `primary_category`, `target_species`
- `trip_catalog` (new) → trips persist on each Save in the modal, so Continue just navigates
- `booking_rules` → save booking fields
- `review` → existing `submitOperatorForReview`

Errors surface as a toast; the user stays on the current step.

## 4. New step: Trip Catalog UI

Inserted in `STEP_ORDER` between `fishing_focus` and `booking_rules`. Sidebar label: "Trip catalog". No skip for guides (they sell trips too).

### Empty state — template gallery
Heading: "Build your trip catalog". Subtext explains they can start from a template tailored to their Primary Category or build from scratch.

Three template cards (filtered by `primary_category` from the store) showing:
- Icon + template title
- Default duration chip (e.g. "~4 hours")
- "Use template →" button

Below: secondary `+ Create custom trip from scratch` button.

If `primary_category` is missing, render a soft warning and a "Go back to Fishing Focus" link.

### Add / Edit Trip modal (shadcn `Dialog`)
Fields:
- **Trip Name** (text, required) — pre-filled from template
- **Duration** (`Select`, required) — 2h, 3h, 4h, 6h, 8h, 10h, 12h, Overnight (16h)
- **Price (USD)** (number, required) — stored as `price_minor`
- **Description** (`Textarea`, required, ~500 char limit)
- **Departure Point** (Google Maps search, required) — see §5

Save calls `upsertTrip`, invalidates the `["my-trips"]` query, closes modal, toast confirms.

### Dashboard view (after at least 1 trip)
Vertical list of summary cards:
- Trip name (bold) + duration chip + formatted price
- Row with `MapPin` icon + departure address (truncated)
- Edit + Delete actions
- Prominent `+ Add Another Trip` button below the list
- `Continue` button (primary, disabled until ≥ 1 trip) → moves to Booking Rules
- `Back` button → Fishing Focus

Validation helper `isTripCatalogValid(state)` = "user has ≥ 1 trip"; the sidebar uses a fresh `useQuery(['my-trips'])` count rather than zustand (trips live server-side only — no draft duplication).

## 5. Google Maps integration (Departure Point)

The Google Maps connector is not yet linked. I'll trigger `standard_connectors--connect` for `google_maps` at the start of build. Once linked:

- Browser autocomplete via Places API (New) `AutocompleteSuggestion.fetchAutocompleteSuggestions` using `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` and the async Maps JS loader
- On select, fetch place details (id, displayName, formattedAddress, location) through the gateway server fn `resolvePlace({ placeId })` so server holds the connector key
- Small read-only `google.maps.Map` preview with a `Marker` at the chosen point inside the modal
- Stored in DB as address + lat + lng + place_id

If the user declines to link Maps, the field falls back to a plain text input for the address (lat/lng nullable). I'll explain that fallback before requesting the connection.

## 6. Files

**New**
- `src/lib/trips.shared.ts` — Zod schemas, `TRIP_TEMPLATES`, duration options
- `src/lib/trips.functions.ts` — `listMyTrips`, `upsertTrip`, `deleteTrip`, `resolvePlace`
- `src/components/operator-onboarding/steps/TripCatalogStep.tsx`
- `src/components/operator-onboarding/trips/TripFormDialog.tsx`
- `src/components/operator-onboarding/trips/DeparturePointPicker.tsx`
- `supabase/migrations/<ts>_trip_packages_departure.sql`

**Edited**
- `src/stores/useOperatorOnboardingStore.ts` — add `trip_catalog` to `StepId`, add `isTripCatalogValid` is server-driven (no store field needed beyond StepId)
- `src/routes/mentor.create-path.tsx` — add step in order/sidebar/switch, wire per-step auto-save in `advance()`
- `src/integrations/supabase/types.ts` — regenerated after migration

## Out of scope
- Public search-filter wiring for the new departure columns
- Calendar / availability per trip (separate step later)
- Image upload per trip (can be added in a follow-up)
- Editing trips after operator is `approved` (keep current "pending" semantics)
