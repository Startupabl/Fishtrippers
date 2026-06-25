## Problem

Two separate booking-type fields exist and they are out of sync:

- `operators.booking_type` uses values `instant` / `inquiry` — this is what the search cards (`OperatorCard.tsx`) and the search filter read.
- `trip_packages.booking_type` uses values `instant_book` / `request_to_book` — this is what the Manage Availability page (`dashboard.master-calendar.tsx`) toggles.

The "Switch all trips" mutation in `src/lib/host-availability.functions.ts` (`setAllTripsBookingType`) only updates `trip_packages`. The parent `operators.booking_type` is never updated, so the search cards keep showing whatever value was set at listing creation (Bespoke Trip / "inquiry").

That's why selecting Instant Book on Manage Availability has no visible effect on the cards.

## Fix

Update `setAllTripsBookingType` so that whenever it flips trip-level booking type, it also writes the matching value to `operators.booking_type` for the same operator:

- `instant_book` → operators.booking_type = `instant`
- `request_to_book` → operators.booking_type = `inquiry`

Both updates run in the same handler, scoped to the resolved `opId`. No schema change, no UI change, no change to search logic or the card.

After this, toggling Instant Book on Manage Availability will immediately propagate to the search/feature cards.

## Out of scope

- Not changing the two enum vocabularies (operators vs trip_packages) — only syncing them.
- Not touching per-trip toggles elsewhere (none currently exist in the flow); if added later, the same sync should be applied.
- Not changing the card copy ("Instant Book" / "Bespoke Trip" already correct in `OperatorCard.tsx`).