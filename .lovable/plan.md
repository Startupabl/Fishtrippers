## Implementation plan (approved)

Database migration already ran successfully — `trip_packages.min_seats_to_sail integer NULL CHECK (NULL OR >= 1)` is live and Supabase types regenerated.

### 1. Fix shared-tour deposit math
**`src/components/operator-listing/TripsBlock.tsx`** (lines 127-128)
```ts
const totalMinorBase = isShared
  ? trip.price_minor * Math.max(1, guests)
  : trip.price_minor + perExtra * Math.max(0, guests - 1);
```
Deposit/balance already derive from `totalMinorBase * 0.1`, so they correct automatically.

### 2. Schema + persistence for `min_seats_to_sail`
- **`src/lib/trips.shared.ts`** — add `min_seats_to_sail: z.number().int().min(1).max(50).nullable().optional()` and a `.refine` that requires `min_seats_to_sail <= seats_available` whenever it's set on a shared tour.
- **`src/lib/trips.functions.ts`** — in the `payload` of `upsertTrip`, include `min_seats_to_sail: data.charter_type === "shared_tour" ? (data.min_seats_to_sail ?? null) : null`.

### 3. Admin form field
**`src/components/operator-onboarding/trips/TripFormDialog.tsx`**
- Add `min_seats_to_sail: number | null` to `TripEditorState` and `empty`.
- Add to the upsert call's `data`.
- Render a new numeric input under the "Total Seats Available" field, shown only when `isShared`:
  - Label: "Minimum Seats to Sail (optional)"
  - Helper: "If this number isn't reached 24 hours before the trip, we'll warn you on your dashboard so you can decide to cancel/refund or run it anyway. Leave blank to always run."
  - Inline validation: must be `>= 1` and `<= seats_available`.
- Seed the field when editing in `dashboard.my-listing.tsx` (`min_seats_to_sail: (t as any).min_seats_to_sail ?? null`).

### 4. Undersold-shared-trip warning banner (dashboard-only, Option a)
- **New server fn `listUndersoldSharedTrips`** in `src/lib/trips.functions.ts`:
  - Auth-required (`requireSupabaseAuth`).
  - Resolves the caller's operator id.
  - Selects shared-tour trips with `min_seats_to_sail IS NOT NULL` owned by this operator.
  - Joins `bookings` (status in `confirmed`/`pending_payment`) grouped by `trip_date`, kept to dates between `now()` and `now() + 48h`.
  - Returns `{ trip_id, title, trip_date, seats_booked, min_seats_to_sail, seats_available, hours_to_departure }[]` only for rows where `seats_booked < min_seats_to_sail`.
- **`src/routes/_authenticated/dashboard.my-listing.tsx`** — query that fn and, if non-empty, render an amber `Card` banner above the trip table:
  - Title: "Below minimum to sail" with `AlertTriangle` icon.
  - One row per undersold date: "{Trip title} — {trip_date} · {seats_booked}/{min_seats_to_sail} seats sold ({hours_to_departure}h to departure)".
  - Subtext: "These shared trips haven't hit your minimum yet. Contact guests to cancel/refund or decide to run them anyway."

### Out of scope (per plan)
- No email/SMS alerts. No auto-cancel/refund. No checkout-page deposit changes (the `/checkout` route still uses a demo selection; `TripsBlock`'s pre-checkout summary is fixed).

I'll execute all of the above on approval.