## Plan

1. **Stop showing stale offer/payment rows in Angler My Bookings**
   - Update the angler bookings query so `pending_payment` rows only show if they are real custom offers with an attached `custom_offer` message.
   - This will hide the current June 25 stale row because it has no custom-offer message and no held availability record.

2. **Make captain cancellation cleanup more complete**
   - When a captain cancels/deletes a pending trip offer, also remove any linked custom-offer messages before deleting the booking, so no orphaned offer UI can rehydrate later.

3. **Keep the review/accept popup behavior**
   - Leave the existing My Bookings offer popup in place for valid open custom offers.
   - After decline or accept changes, refresh the bookings list so declined/deleted offers disappear without needing a hard refresh.

4. **Validate with the known June 25 case**
   - Confirm the visible June 25 `pending_payment` row is no longer returned by the angler bookings function after the query filter change.