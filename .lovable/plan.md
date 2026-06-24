## Goal

Persist the operator-type distinction in the database. Charters keep `private_charter` / `shared_tour`; Guides store the new values `private_trip` / `small_group_trip`. The booking model is identical within each pair — only the labels differ — so all downstream logic keeps working through small helpers.

## Data model

`trip_packages.charter_type` is a Postgres enum `public.trip_charter_type`. Extend it from 2 → 4 values:

| Value              | Operator | UI label         | Capacity model                                        |
| ------------------ | -------- | ---------------- | ----------------------------------------------------- |
| `private_charter`  | Charter  | Private Charter  | Whole-boat private; `max_party_size` + `per_extra_minor` |
| `shared_tour`      | Charter  | Shared Tour      | Per-seat shared; `seats_available` + `min_seats_to_sail` |
| `private_trip`     | Guide    | Private Trip     | Whole-group private; `max_party_size` + `per_extra_minor` |
| `small_group_trip` | Guide    | Small Group Trip | Per-person shared; `seats_available` + `min_seats_to_sail` (same as Shared Tour, just labeled "spots") |

No other columns or constraints change. Existing rows are not migrated.

## Migration

Two enum additions (separate `ALTER TYPE` statements):
```sql
ALTER TYPE public.trip_charter_type ADD VALUE IF NOT EXISTS 'private_trip';
ALTER TYPE public.trip_charter_type ADD VALUE IF NOT EXISTS 'small_group_trip';
```

## Shared helpers (`src/lib/trips.shared.ts`)

- Extend Zod: `charter_type: z.enum(["private_charter","shared_tour","private_trip","small_group_trip"])`.
- Update the two `superRefine` rules so seats validation triggers on **any shared kind** (`shared_tour` OR `small_group_trip`).
- Export:
  ```ts
  export type TripType = "private_charter" | "shared_tour" | "private_trip" | "small_group_trip";
  export const isSharedTripType = (t: TripType) => t === "shared_tour" || t === "small_group_trip";
  export const isPrivateTripType = (t: TripType) => t === "private_charter" || t === "private_trip";
  export const TRIP_TYPE_LABELS: Record<TripType, string> = {
    private_charter: "Private Charter",
    shared_tour: "Shared Tour",
    private_trip: "Private Trip",
    small_group_trip: "Small Group Trip",
  };
  export function getTripTypeOptions(businessType: "charter" | "guide" | null | undefined) {
    // returns [{value, label, hint}, {value, label, hint}] for the right pair
  }
  ```
- Keep `CHARTER_TYPE_OPTIONS` exported (charter pair) for back-compat, but the form will use `getTripTypeOptions`.

## Replace literals with helpers

Swap every `=== "shared_tour"` for `isSharedTripType(...)` and `=== "private_charter"` for `isPrivateTripType(...)` in:

- `src/lib/trips.functions.ts` (`upsertTrip` payload; `listUndersoldSharedTrips` filter on line 230 — switch the `.eq("charter_type", "shared_tour")` to `.in("charter_type", ["shared_tour","small_group_trip"])`).
- `src/lib/trip-bookings.functions.ts` (type unions widened to `TripType`; price calc, validation, summary branches).
- `src/lib/host-availability.functions.ts` (type union widened; shared-vs-private branch).
- `src/components/operator-listing/TripsBlock.tsx` (`isShared` + `charterLabel`).
- `src/components/operator-listing/CheckDatesDialog.tsx` (`isShared`).
- `src/components/operator-onboarding/trips/TripFormDialog.tsx` (all validation branches).
- `src/components/operator-onboarding/steps/TripCatalogStep.tsx` (fallback stays `private_charter` for legacy template seeding).
- `src/routes/_authenticated/dashboard.my-listing.tsx` (the editor seed fallback).
- `src/routes/_authenticated/booking.checkout.tsx` (summary copy branch).

## Trip dialog + business_type awareness

- `src/lib/trips.functions.ts` — extend `getMyCapabilities` to also return `business_type` (`"charter" | "guide" | null`) from `operators`.
- `src/components/operator-onboarding/trips/TripFormDialog.tsx`:
  - Read `business_type` from `caps`.
  - When opening for a **new** trip, default `charter_type` to `private_trip` for guides and `private_charter` for charters.
  - Render `getTripTypeOptions(business_type)` instead of `CHARTER_TYPE_OPTIONS`.
  - When the user picks the shared option from either pair (`shared_tour` OR `small_group_trip`), seed `seats_available` like today.
  - For guides, label the "Total seats available" field as **"Total spots available"** and "Minimum seats to sail" as **"Minimum spots required"** (purely a string swap inside the dialog).
  - Rename the section heading from "Booking type" to "Trip type".

## Public + preview listing labels

`src/components/operator-listing/TripsBlock.tsx`:
- Replace `const charterLabel = isShared ? "Shared trip" : "Private trip";` with `const charterLabel = TRIP_TYPE_LABELS[trip.charter_type ?? "private_charter"];`.
- Label updates automatically when the trip is edited because it's derived from the row.

No prop changes needed on `TripsBlock` itself for this — the value lives on each trip row, which already flows through both the public route and the operator preview.

## Out of scope

- Existing `private_charter` / `shared_tour` rows are not rewritten to guide variants.
- No RLS or GRANT changes (`trip_packages` policies are unaffected by adding enum values).
- `dashboard.my-listing.tsx` trip-table column copy unchanged (no request to relabel it).

## Result

- **Guide → creates trip → Step 5** shows **Private Trip** / **Small Group Trip**, persisted as `private_trip` / `small_group_trip`.
- **Charter → creates trip → Step 5** unchanged: stores `private_charter` / `shared_tour`.
- The public listing trip card shows the exact label for the stored value (e.g. *"Small Group Trip: 3 spots left!"*) and re-renders instantly on edit.
- Booking, availability, and checkout logic continue to work because they branch on `isSharedTripType` / `isPrivateTripType`, not hardcoded literals.