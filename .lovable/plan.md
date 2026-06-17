
## Goal

Let every trip be either **Instant Book** or **Request to Book**, and give each captain/guide a single **Master Calendar** that gates all instant-bookable trips so they never double-book themselves. Instant-book trips whose owner hasn't set up the calendar yet gracefully fall back to a Request to Book flow.

---

## 1. Database changes (one migration)

**`trip_packages.booking_type`** — new enum column `trip_booking_type` (`'instant_book' | 'request_to_book'`), default `'request_to_book'`, NOT NULL. Backfill: existing trips inherit from their operator's `booking_type` (`'instant'` → `'instant_book'`, else `'request_to_book'`).

**`host_availability`** — new table:
- `id uuid pk`, `host_id uuid` (→ `operators.id`, cascade), `date date`, `status text check in ('booked','blocked')`, optional `booking_id uuid` (→ `bookings.id`) for booked rows, `created_at`, `updated_at`.
- Unique `(host_id, date)`.
- RLS + GRANTs: owner (operator's `user_id`) can SELECT/INSERT/UPDATE/DELETE their own rows; `anon` + `authenticated` get SELECT-only on `(host_id, date, status)` so the tripper datepicker can read it; `service_role` ALL.
- Index on `(host_id, date)`.

**Trigger** `tg_block_date_on_booking_paid`: when a `bookings` row transitions to a paid/confirmed state and has a `trip_date`, upsert `host_availability(host_id, date=trip_date, status='booked', booking_id)`. On cancel/refund, delete that booked row.

*(If `bookings.trip_date` doesn't exist yet, add it in the same migration.)*

---

## 2. Captain dashboard

**Alert next to "Connect Stripe" banner** (`src/routes/_authenticated/dashboard.my-listing.tsx`): when the operator has ≥1 trip with `booking_type = 'instant_book'` AND zero `host_availability` rows, render an amber card:
> ⚠️ Action Required: Configure your Master Calendar to accept automatic instant bookings.
With a **"Manage Availability"** button → `/dashboard/master-calendar`. Persists until they save at least one calendar entry OR switch all trips off instant book.

**Sidebar** (`src/components/dashboard/WorkspaceSidebar.tsx`): replace "Lab Hours" with **"Manage Availability"** → `/dashboard/master-calendar` (icon: `CalendarDays`).

**Listing actions row**: add a `CalendarDays` icon button titled "Manage Availability" → `/dashboard/master-calendar`, next to Edit/Preview icons.

---

## 3. Master Calendar page — `/dashboard/master-calendar`

New route `src/routes/_authenticated/dashboard.master-calendar.tsx`.

- **12-month grid** starting at current month. Each day cell: Available (default), Blocked (host-set), Booked (read-only).
- Click toggles Available ↔ Blocked; click-drag selects ranges; "Block week" / "Block weekend" quick actions.
- Top of page: **Booking mode toggle** — "Instant Book" / "Request to Book". Bulk action that updates `booking_type` on every trip of this operator (confirm dialog). Per-trip override remains in the trip editor.
- Server fns in `src/lib/host-availability.functions.ts`: `listHostAvailability`, `setHostAvailability`, `clearHostAvailability`, `setAllTripsBookingType`.

Existing "Lab Hours" editor in `settings.profile.tsx` is untouched (different feature).

---

## 4. Public listing — Trip card button (with fallback)

`src/components/operator-listing/TripsBlock.tsx`:

- Add `booking_type` to the `Trip` interface; loader (`src/lib/operator-listing.functions.ts`) also returns `host_has_availability` per operator (boolean: does this operator have ≥1 `host_availability` row?).
- Three render branches per trip:
  1. **`request_to_book`** → button **"Request to Book"**, opens `RequestToBookDialog`.
  2. **`instant_book` AND `host_has_availability`** → button **"Check Dates"**, opens `CheckDatesDialog` (shadcn Calendar w/ `pointer-events-auto`) that queries `host_availability` and disables `booked` + `blocked` dates. On confirm → `/checkout` with `trip_id`, `trip_date`, `guests`.
  3. **`instant_book` AND NOT `host_has_availability`** (calendar not set up yet) → muted info note above the button:
     > *"The calendar isn't updated for this trip yet — instant booking isn't available. You can still send the host a request."*
     and the CTA becomes **"Request to Book"** (opens the same `RequestToBookDialog`). No "Check Dates" button is shown in this state.

---

## 5. Request to Book form

New `src/components/operator-listing/RequestToBookDialog.tsx`:
- Fields: date (Calendar), start time (defaults to trip's `start_time`), duration in hours (prefilled from trip), number of people (stepper bounded by min/max party), message (textarea).
- On submit → `submitTripRequest` server fn (`src/lib/trip-requests.functions.ts`, `requireSupabaseAuth`):
  1. Find or create `message_threads` row between tripper and operator's owner, tied to operator/trip.
  2. Insert `messages` row with the formatted request body (date, time, hours, people, message).
  3. Return thread id → navigate to `/dashboard/messages/$threadId`.
- Operator already has the **Custom Offer** composer in their inbox to respond — no change in this task.

---

## 6. Booking → calendar sync

In `src/lib/bookings.functions.ts` / Stripe webhook:
- Ensure paid instant-book bookings carry `trip_date`; trigger writes `host_availability` as `booked`. Belt-and-suspenders: explicit `INSERT ... ON CONFLICT DO NOTHING` from the server fn too.
- Race: if date taken between modal open and submit, return `{ ok: false, reason: 'date_taken' }`; `CheckDatesDialog` shows a friendly retry.

---

## Files

**New**
- `supabase/migrations/<ts>_master_calendar.sql`
- `src/routes/_authenticated/dashboard.master-calendar.tsx`
- `src/lib/host-availability.functions.ts`
- `src/lib/trip-requests.functions.ts`
- `src/components/dashboard/MasterCalendarGrid.tsx`
- `src/components/operator-listing/CheckDatesDialog.tsx`
- `src/components/operator-listing/RequestToBookDialog.tsx`

**Edited**
- `src/components/dashboard/WorkspaceSidebar.tsx`
- `src/routes/_authenticated/dashboard.my-listing.tsx` (alert + action icon)
- `src/components/operator-listing/TripsBlock.tsx` (3-way button logic + fallback note)
- `src/lib/operator-listing.functions.ts` (select `booking_type` + `host_has_availability`)
- `src/lib/trips.functions.ts` (allow `booking_type` in create/update)
- `src/components/operator-onboarding/trips/TripFormDialog.tsx` (per-trip booking_type, defaults to operator setting)
- `src/lib/bookings.functions.ts` (write `trip_date`, post-paid upsert + race handling)
- `src/integrations/supabase/types.ts` (auto-regenerated)

---

## Open questions (please confirm before I build)

1. **Source of truth for booking_type** — per-trip (`trip_packages.booking_type`) as your spec says, with operator-level field as default for new trips. OK?
2. **Master Calendar granularity** — date-only (no time slots). A paid booking blocks the whole date for that host across all trips. OK?
3. **Bulk toggle scope** — Manage Availability page toggle flips **all** trips at once; per-trip override stays in the trip editor. OK?
