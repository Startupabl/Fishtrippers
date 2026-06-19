Trim the Captain's Schedule page (`/dashboard/upcoming-sessions`) to focus exclusively on trip bookings.

## Changes to `src/routes/_authenticated/dashboard.upcoming-sessions.tsx`

1. **Remove the "Trip Bookings" subtitle block** — delete the `<h2>Trip Bookings</h2>` heading and the "Charter and guided-trip reservations and pending custom offers." description above each trip table (both Upcoming and Completed tabs).

2. **Remove the Course Schedule sections entirely** — delete both `<section>` blocks that render `renderTable(...)` ("Course Schedule" on the Upcoming tab and "Completed Course Sessions" on the Completed tab). Also remove the now-unused course-schedule machinery from the file: imports and calls related to `listAideScheduleRows`, `editUnbookedSlot`, `deleteUnbookedSlot`, `deleteEntireSession`, `requestReschedule`, `cancelReschedule`, `listSessionCompletions`, `markSessionComplete`, `markOrderComplete`, the `ScheduleTableRow` helper, the Edit / Reschedule / Delete dialogs, and the related state (`editTarget`, `rescheduleTarget`, `deleteTarget`, `completions`, `rows`, etc.). Tab counts are recomputed from trip bookings only.

3. **Remove the "Your earnings" column** from the trip-bookings table (header + cell, adjust `colSpan` from 7 → 6).

4. **Always show "Mark as Complete" for confirmed bookings** — drop the `trip_date <= today` gate. Any booking with `status === "confirmed"` in the Upcoming tab gets the Mark as Complete button. (Captain currently sees no action because all confirmed trips are still in the future.)

5. **Hide "pending_payment" rows unless they're custom offers** — Instant Book is paid at booking time, so a pending_payment Instant Book row is filtered out of `upcomingTripBookings`. Custom offers with `pending_payment` still appear so the captain can see the buyer hasn't finished checkout.

## Out of scope

- No changes to server functions, database, angler bookings page, earnings page, or admin transactions.
- Course-schedule server functions remain in `src/lib/schedule.functions.ts` (still used by other dashboards); only this page stops importing them.
