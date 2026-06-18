## Add `charter_type` (Private Charter vs Shared Tour) to trip form

### 1. Database migration

Add a new enum + column on `trip_packages`:

```sql
CREATE TYPE public.trip_charter_type AS ENUM ('private_charter', 'shared_tour');

ALTER TABLE public.trip_packages
  ADD COLUMN charter_type public.trip_charter_type NOT NULL DEFAULT 'private_charter',
  ADD COLUMN seats_available integer;
```

- `charter_type` defaults to `private_charter` so existing rows are valid.
- `seats_available` is nullable; only meaningful when `charter_type = 'shared_tour'`. Used by the shared calendar seat-countdown logic to know the total seats per trip date.
- The existing `booking_type` column (instant_book / request_to_book) is left untouched — different concept (booking flow).

### 2. Schema / shared types (`src/lib/trips.shared.ts`)

- Add `CHARTER_TYPE_OPTIONS`:
  - `private_charter` — `"Private Charter (Book the entire boat)"`, hint about whole-boat pricing.
  - `shared_tour` — `"Shared Tour (Book per seat)"`, hint about per-seat pricing.
- Extend `tripInputSchema`:
  - `charter_type: z.enum(["private_charter", "shared_tour"]).default("private_charter")`
  - `seats_available: z.number().int().min(1).max(50).nullable().optional()`
  - Refine: when `charter_type === "shared_tour"`, `seats_available` is required (>= 1).

### 3. Server function (`src/lib/trips.functions.ts`)

In `upsertTrip` payload:
- `charter_type: data.charter_type ?? "private_charter"`
- `seats_available: data.charter_type === "shared_tour" ? (data.seats_available ?? null) : null`

### 4. Trip form UI (`src/components/operator-onboarding/trips/TripFormDialog.tsx`)

State:
- Add to `TripEditorState`: `charter_type: "private_charter" | "shared_tour"` and `seats_available: number | null`.
- `empty` defaults: `charter_type: "private_charter"`, `seats_available: null`.
- When loading `initial`, fall back to `"private_charter"` if missing — form always opens with Private Charter pre-selected.

Layout — at the absolute top of the dialog, BEFORE the "Trip title" input, add a new prominent section:

```
┌──────────────────────────────────────────────────────────────┐
│ BOOKING TYPE                                                 │
│ ┌────────────────────────────┐ ┌────────────────────────────┐│
│ │ ● Private Charter          │ │ ○ Shared Tour              ││
│ │   Book the entire boat     │ │   Book per seat            ││
│ └────────────────────────────┘ └────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

Styling: reuse the selected/unselected tile pattern from the existing "Booking method" section (primary ring on selected), rendered larger — two-column grid on sm+, full-width on mobile, section header "Booking type" using the same uppercase-tracking style as other section headers.

Dynamic pricing / capacity behavior:

**Private Charter (default)** — pricing UI unchanged:
- "Base price (1st angler)" stays.
- "Max trip size" / "Min trip size" stay.
- "Price per additional angler" stays.
- Totals preview stays as "Total Trip Price (Full Boat)".

**Shared Tour**:
- **Pricing field**: keep the single price input, relabel to **"Price per Seat"** with helper text **"Enter the cost for an individual seat on this trip."** (still bound to `price_minor`).
- **Capacity field**:
  - Hide the "Max trip size" (max party size) input entirely.
  - Reveal a new numeric input **"Total Seats Available"** bound to `seats_available` (integer, min 1, max 50, placeholder `6`).
  - Helper text: **"Enter the maximum number of individual seats you can sell in total for this shared trip (e.g., 6)."**
  - On save, this value is persisted to `trip_packages.seats_available` and is what the shared calendar uses for the seat countdown.
- Hide "Price per additional angler" and force `per_extra_minor = 0` on toggle into Shared Tour.
- "Min trip size" stays (minimum guests required to run the trip).
- Totals preview becomes **"Total if fully booked"** = `price_minor * seats_available`, with the same 10% deposit / 90% take-home math.

Toggle side-effects (single `setForm` per click):
- → `shared_tour`: `per_extra_minor = 0`; if `seats_available` is null, seed it from current `max_party_size`.
- → `private_charter`: leave `seats_available` in state but don't send it.

Submit mutation validation:
- `charter_type === "private_charter"` → existing `max_party_size >= 1` check.
- `charter_type === "shared_tour"` → `seats_available >= 1` check; skip the max_party_size check.
- Pass `charter_type` and `seats_available` through `upsertFn`.

### 5. Files touched

- New migration (via migration tool).
- `src/lib/trips.shared.ts`
- `src/lib/trips.functions.ts`
- `src/components/operator-onboarding/trips/TripFormDialog.tsx`

No changes to public listing / booking pages in this plan — follow-up once captains start setting the new field.
