# Shared-tour seat availability across calendar + trip header

## 1. Database — track seats per booking

The `bookings` table currently has no per-booking guest count, so we can't compute "seats booked for a date". Add it.

- Migration on `public.bookings`:
  - Add `guests integer not null default 1 check (guests >= 1)`.
  - Backfill existing rows to `1`.
- No RLS changes (existing policies cover the new column).

## 2. New public server fn — per-date seat counts

New `getTripDateAvailability` in `src/lib/host-availability.functions.ts` (public, publishable-key client):

- Input: `{ trip_id: uuid, host_id: uuid }`.
- Reads `trip_packages` row (charter_type, seats_available, max_party_size).
- For `shared_tour`: sums `bookings.guests` grouped by `trip_date` for that `course_id = trip_id` where `status in ('confirmed','pending_payment')` (active holds).
- Returns:
  ```
  {
    charter_type: 'shared_tour' | 'private_charter',
    seats_available: number | null,
    bookedByDate: Record<'YYYY-MM-DD', number>,  // shared only
    blockedDates: string[]                       // from host_availability for private flow
  }
  ```
- For `private_charter` it returns just `blockedDates` (existing behavior preserved).

Narrow `TO anon` SELECT on `trip_packages` already exists for the public listing; we will also need anon to read aggregate counts from `bookings`. Use an SQL view + grant, or expose only the aggregate via a `security definer` SQL function `public.trip_seats_booked_by_date(_trip_id uuid)` returning `(trip_date date, seats_booked int)` — preferred so we never grant anon raw SELECT on bookings. The server fn calls this RPC.

## 3. Calendar dialog — `CheckDatesDialog.tsx`

- Replace `getPublicHostAvailability` call with the new `getTripDateAvailability` (passing `trip_id` + `host_id`).
- Compute `remainingByDate[date] = seats_available - (bookedByDate[date] ?? 0)` for shared tours.
- Date disabling rules:
  - Past dates: disabled (unchanged).
  - Private charter: any date in `host_availability` rows (booked/blocked) → disabled (unchanged).
  - Shared tour: a date is disabled only when `remaining <= 0` OR it's explicitly blocked.
- After date selection (shared tour):
  - Show inline message under the calendar: `"X seats left on {date}"` or `"Sold out for this date"`.
  - Cap the `guests` count: if the caller-supplied `guests` > remaining, clamp it and show alert `"Only X seats left."` before allowing Continue.
- Pass `remaining` back to the parent via an `onDateSelected(date, remaining)` callback so the header can react (see step 4). Simpler: lift the `selectedDate` + `remaining` for that trip into `TripCard` state via the dialog's `onOpenChange`/`onSelect` callback.

## 4. Guests stepper in `TripCard`

For shared tours:
- Replace `maxParty` upper bound with `seats_available` (already partially done via `capacity`).
- When a date is selected, further cap stepper at `remaining`. If user clicks `+` past remaining, show toast: `"Only X seats left."`.

## 5. Dynamic trip header text — `TripsBlock.tsx` `TripCard`

Currently the bottom-right line renders `{charterLabel}: Up to {capacity} guests` (line 227).

Add per-card state `selectedDate` and `remainingSeats` populated when the CheckDatesDialog selects a date (and from a lightweight `useQuery(getTripDateAvailability)` on mount so we can also show partials before the dialog is opened — optional; start with dialog-only).

Render rules for shared tours:
- No date selected → `"Shared tour: Up to {seats_available} guests"` (current).
- Date selected, `0 < remaining < seats_available` → bold high-visibility `"Shared tour: {remaining} spots left!"` (text-foreground font-bold, accent color).
- `remaining <= 0` → red badge `"Sold Out for this date"` (destructive bg).
- Private charter: unchanged (`"Private trip: Up to {maxParty} guests"`).

## 6. Out of scope
- No changes to checkout pricing math (still uses existing per-guest logic — shared tours already price per seat via `price_minor`).
- Admin Trip Setup form, schema for `charter_type`/`seats_available`: already done previously.
- No real-time/subscription wiring; React Query refetch on dialog open is enough.

## Technical notes
- Files touched: `supabase/migrations/<new>.sql`, `src/lib/host-availability.functions.ts` (new fn + RPC call), `src/components/operator-listing/CheckDatesDialog.tsx`, `src/components/operator-listing/TripsBlock.tsx`.
- New Postgres function `public.trip_seats_booked_by_date(uuid)` `security definer` `set search_path = public`, granted `EXECUTE TO anon, authenticated`.
- Active-hold statuses considered for seat counting: `confirmed` and `pending_payment` (Stripe-hold) — confirm if you'd like a different set.
