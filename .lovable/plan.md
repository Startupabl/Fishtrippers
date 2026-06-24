Switch the "From {price}" label on operator cards to per-additional-guest pricing instead of first-guest pricing.

## Logic

For each `trip_packages` row, compute a "per-person card price":
- **Shared types** (`shared_tour`, `small_group_trip`): use `price_minor` — already the per-person rate.
- **Private types** (`private_charter`, `private_trip`): use `per_extra_minor` when it is set and > 0; otherwise fall back to `price_minor` (legacy/older trips that never set per-extra).

Pick the cheapest of those values across the operator's active trips, format with `formatPrice` and the trip's `currency`, and return as `lowest_price_label`.

## Files touched

- `src/lib/operators-search.functions.ts`
  - Add `per_extra_minor, charter_type` to the trip-package projection.
  - Replace the cheapest-by-`price_minor` loop with a cheapest-by-card-price loop using `isSharedTripType` from `src/lib/trips.shared.ts`.
  - No DTO field rename — `lowest_price_label` keeps its name and shape.

## Out of scope

- Card UI (`OperatorCard.tsx`) — already renders `lowest_price_label` verbatim, no change needed.
- Trip-level price filters (`priceMinMinor`/`priceMaxMinor`) — left filtering on `price_minor` for now; user didn't ask to retune the search filter.
- Checkout/order math — unchanged.

## Verification

- Spot check: Blue Ocean Charters' Private Charter (price 400, per-extra 200) should now show "From US $200".
- A Shared Tour priced at $85/person should still show "From US $85".
- A private trip with `per_extra_minor` null should still show its original `price_minor`.