## Goal

All new trips default to **Request to Book** by default. On the public listing page, the "Check availability" / request flow uses the existing **Request to Book form** (already designed — not a dialog, the form that sends a request to the captain). Captains can later switch a listing/trip to Instant Book from the Manage Availability page using the toggle that's already built.

## Changes

### 1. Trip form (Step 5) — `src/components/operator-onboarding/trips/TripFormDialog.tsx`
- Remove the entire "Booking method" `<section>` (lines ~471–500), including the `BOOKING_TYPE_OPTIONS` grid.
- Keep `booking_type: "request_to_book"` hard-coded in the form's initial state (already the default on line 93) and continue saving it on submit. Drop the now-unused `BOOKING_TYPE_OPTIONS` import if nothing else references it.

### 2. Booking rules (Step 6) — `src/components/operator-onboarding/steps/BookingRulesStep.tsx`
- Remove the entire "How should bookings work?" `<section>` (lines ~46–97), including the `Zap` / `MessageSquare` icon imports if no longer used.
- In `useOperatorOnboardingStore`, force `booking_type` to `"inquiry"` (Request to Book) on store init / reset, and have `isBookingRulesValid` ignore `booking_type` (since the field is no longer user-editable). The store still persists the value so downstream code keeps working.
- Keep Advance notice, Cancellation policy, and Weather policy sections unchanged.

### 3. Manage listing alert — `src/routes/_authenticated/dashboard.my-listing.tsx`
- Update the existing amber "Action Required" banner copy (lines 273–294) to instead prompt: **"Set up How Bookings Work"** — "Choose Instant Book or Request to Book and configure your calendar." Button label: **"Manage Availability"**, link unchanged (`/dashboard/master-calendar`).
- Trigger condition: show whenever the operator has trips AND has not yet set the booking preference on the availability page (broaden the current `showCalendarBanner` flag so it appears for all new listings, not only when an instant-book trip already exists).

### 4. No changes (already built — confirming they remain part of the flow)
- Manage Availability page toggle (Instant Book vs Request to Book) and the instant-book calendar.
- Public listing page "Check availability" → existing **Request to Book form** (the full form that sends the request to the captain, not a dialog).
- DB schema unchanged; `booking_type` column on trips still defaults to `request_to_book`.

## Verification

- Create a new trip → form has no "Booking method" box; trip saves with `booking_type = request_to_book`.
- Step 6 → no "How should bookings work?" box; Continue still works without selecting a booking type.
- Submit listing → manage listing page shows updated alert linking to Manage Availability.
- On a public listing page, "Check availability" opens the existing Request to Book form.
