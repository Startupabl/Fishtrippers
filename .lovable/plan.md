## Goal
For shared trips (Shared Charters / Small Group Trips) where the per-extra-angler price is lower than the 1st-angler price, surface the lower per-extra price as the "From" headline on operator cards and as the trip-card headline on the listing page.

## Changes

### 1. `src/lib/operators-search.functions.ts` (cards on search & featured)
In `cardPriceFor`, the shared branch currently returns `price_minor` (1st angler). Update it to return `min(price_minor, per_extra_minor)` when `per_extra_minor > 0`. Private charter and private_trip logic stays untouched.

Result: Blue Ocean Charters ($400 / $200) → card shows `From $200.00 / angler`.

### 2. `src/components/operator-listing/TripsBlock.tsx` (per-trip headline on listing page)
The shared-trip headline currently renders `formatCurrency(baseDisplay)` (= `price_minor`). Change the headline value for shared trips to `min(price_minor, per_extra_minor>0 ? per_extra_minor : price_minor)` and prefix with `From ` so it's clear it's the lowest per-angler price. Private Charter / Private Group headlines remain `entire boat` / `private group` with their flat price.

The booking math (`totalMinorBase = price_minor + perExtra * (guests-1)`), the Info popover breakdown (1st angler base + each additional), deposit, and balance all remain unchanged — only the headline label changes.

### Out of scope
- `ListingCard.tsx` (legacy lesson-paths fixtures, not charter operators) — not touched.
- Booking totals, deposits, popover breakdown — unchanged.