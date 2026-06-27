## Problem

In `src/components/operator-listing/TripsBlock.tsx`, the shared-trip total is computed as:

```ts
const totalMinorBase = isShared
  ? trip.price_minor * Math.max(1, guests)            // BUG
  : trip.price_minor + perExtra * Math.max(0, guests - 1);
```

For Blue Ocean Charters (shared, $400 first / $200 each additional), 3 guests resolves to $400 × 3 = $1,200 instead of $400 + $200 × 2 = $800. The "Due Now to Book" (10% deposit) and remaining balance inherit the wrong total.

## Fix

Use the same first-angler + per-extra formula for shared trips as for private:

```ts
const totalMinorBase = trip.price_minor + perExtra * Math.max(0, guests - 1);
```

This applies to all three branches (shared, private charter, private group). Private charter/private group already have `per_extra_minor = 0`, so their totals stay equal to `price_minor` (flat) — no regression. Shared trips now correctly bill 1st angler at base + each additional at the captain's per-extra rate.

Deposit (10%) and remaining balance derive from this total automatically, so they will also become correct.

## Scope

- File touched: `src/components/operator-listing/TripsBlock.tsx` only.
- No changes to card pricing, search results, checkout server logic, or DB.
- No change to the price-details popover copy (still shows "1 person / +1 additional person" for shared).

## Verification

After the edit:
1. Open Blue Ocean Charters listing, expand the shared trip, set guests = 3 → Total Trip Cost shows $800, Due Now shows $80.
2. Switch to a Private Charter trip with `per_extra = 0` → Total stays at flat boat price regardless of guest count (unchanged behavior).
3. Switch to a Private Group (guide) trip → same flat-group behavior preserved.
