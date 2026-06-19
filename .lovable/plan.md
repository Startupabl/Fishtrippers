## Plan

Rebuild the Angler Purchase History page at `/dashboard/learner/purchases` so it lists every trip booking (instant book + accepted custom offers) in a flat, filterable table driven by the captain's completion status.

### Data source
- Replace the current `listMyOrdersLearner` driven view with `listMyTripBookingsLearner` so the page reflects real trip transactions (the same source as My Bookings and the receipt modal).
- Only include rows that have actually been paid online: `confirmed` and `completed`. Pending/declined rows stay out of purchase history.

### Columns (in order)
1. Date Paid — `created_at` formatted as local date.
2. Order # — short order id derived from `booking.id` (same `#XXXXXX` helper used in the receipt).
3. Trip Name — `trip_title`.
4. Total Price — `total_price_minor` in the booking's currency.
5. Deposit Paid — `deposit_minor` in the booking's currency.
6. Dock Balance — single column whose label and styling change per row:
   - `confirmed` → header cell text "Due at Dock", row value rendered bold.
   - `completed` → header cell text "Paid at Dock", row value rendered normal/muted.
   - Because the label is per-row, render it inline within the cell as a small caption above the amount so a single table header can read "Dock Balance" while each row clearly states its own state.
7. Actions — "View Receipt" button that opens the existing `TripReceiptDialog`.

All currency uses the booking's own currency code (no forced conversion), matching the receipt modal's fix.

### Filters row (above the table)
- Timeframe dropdown: All Time (default) / This Month / This Year, filtering by `created_at`.
- Search input with placeholder "Search by Order # or Trip…", matching against the short order number and `trip_title` (case-insensitive).

### Out of scope
- No change to the receipt modal, My Bookings page, or schedule panel.
- No new route file; the existing `dashboard.learner.purchases.tsx` is rewritten in place.
- Legacy `OrderSchedulePanel` / expand-row UX is removed since trip bookings don't have multi-session schedules.

### Files touched
- `src/routes/_authenticated/dashboard.learner.purchases.tsx` — full rewrite.