# Rebuild Captain's "My Earnings" — single trip-bookings block

Strip the page down to a single data block driven by trip bookings (the pay-at-dock model). Remove the orders-based section entirely.

## Layout

Title + subtitle ("Your financial performance — the deposit covers the platform fee; the remaining balance is collected at the dock.") then exactly three sections: summary cards → filter bar → one earnings table → receipt dialog.

## 1. Top summary cards (3, brand-aligned)

Driven entirely by `listMyTripBookingsAide()`. Drop orders entirely.

- **Completed Earnings** — sum of `balance_due_minor` across bookings with `status === "completed"`. Money-tone value.
- **Projected Earnings** — sum of `balance_due_minor` across `status === "confirmed"` with `trip_date >= today`.
- **Trips Run** — count of `status === "completed"`.

All currency converted to viewer currency via `convertMinor` (same pattern already in the file). No deposit/platform-fee amounts shown anywhere on the page.

## 2. Filter row (above the table)

- **Left — Timeframe `<Select>`** with options: `all` (default), `this_month`, `this_year`, `last_12_months`. Filters by `trip_date` (fallback to `created_at` when null). Replace the current Timeframe options; remove the "Trip" course filter.
- **Right — Search `<Input>`** with `Search` magnifying-glass icon and placeholder `Search by Order #, Angler, or Trip...`. Debounce-free, real-time `onChange` filter (case-insensitive `includes`) across:
  - displayed order number (`#` + last 6 chars of `booking.id` uppercased — same identifier used in the row)
  - `primary_angler_name ?? learner_name`
  - `trip_title`

Filter row uses `flex flex-wrap justify-between gap-3`.

## 3. Earnings History table

One table, rows = completed + confirmed trip bookings (no `pending_*`, no `declined`). Columns:

| Col | Source |
|---|---|
| Date | `trip_date` (formatted), fallback `created_at` |
| Order Number | `#` + last 6 chars of `booking.id` upper-cased |
| Trip Title | `trip_title` + ` (Instant Book)` or ` (Custom Offer)` from `source` |
| Angler Name | `primary_angler_name ?? learner_name ?? "—"` |
| Money Earned | `formatCurrency(balance_due_minor/100, currency)` — money-tone |
| Status | `<Badge>` — `Completed` (green/money) when `status==="completed"`, `Projected` (accent/gold) when `confirmed` |
| Actions | `View Receipt` button (Receipt icon) — opens dialog |

Date header keeps the existing asc/desc toggle. Empty state: "No trip earnings yet — once a trip is booked, it will show up here." Filter empty state: "No trips match the current filters."

## 4. Receipt dialog

`ReceiptDialog` currently takes an `OrderSummary`. For trip bookings, create a small adapter dialog `TripReceiptDialog` (new file `src/components/earnings/TripReceiptDialog.tsx`) that takes a `TripBookingSummary` + `captainName` and renders a printable summary: order #, trip title + type, date, angler name + phone, guests, then a financial breakdown — Total trip price, Deposit collected online, Balance due at dock (highlighted as the captain's money earned). Reuses the existing print/close UX from `ReceiptDialog`. The old `ReceiptDialog` stays in the repo (other pages may use it) but is no longer imported here.

## Files to edit / create

- **Edit** `src/routes/_authenticated/dashboard.earnings.tsx` — full rewrite of the component body per above. Remove: `listMyOrdersAide`, `OrderSummary`, `usePlatformFee`, `courseFilter`, the second "Trip Bookings" section, the old `EarningsRow`, the `last_month` timeframe option. Keep: `display` style, currency hooks, sort toggle.
- **Create** `src/components/earnings/TripReceiptDialog.tsx` — printable receipt for one `TripBookingSummary`.

## Out of scope

- No schema changes (bookings already carry `balance_due_minor`, `status`, `source`).
- No changes to `listMyTripBookingsAide` or other server functions.
- No changes to admin or angler dashboards.
- No changes to the existing `ReceiptDialog` (used elsewhere).
