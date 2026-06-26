## Problem

Operator cards on the Search and Featured (home/category) pages show a price that doesn't react to the currency switcher, while listing pages do.

Root cause: `getOperatorsSearch` (server fn) pre-formats the price into `lowest_price_label` using `formatPrice(...)`, which reads `useCurrencyStore.getState()` once on the server. The result is cached by TanStack Query, so changing the currency on the client doesn't re-render it. Listing pages format on the client via `useFormattedPrice`, so they update correctly.

## Fix

Move price formatting for cards to the client so it subscribes to `useCurrencyStore`.

1. `src/lib/operators-search.functions.ts`
   - Replace `lowest_price_label: string | null` in `OperatorCardDTO` with raw fields:
     - `lowest_price_minor: number | null`
     - `lowest_price_currency: string | null`
   - Stop calling `formatPrice` in the server mapper; pass `cheapest.price_minor` and `cheapest.currency` through.

2. `src/components/listings/OperatorCard.tsx`
   - Format the price with `useFormattedPrice(lowest_price_minor, lowest_price_currency as CurrencyCode)` (guarded when null).
   - Keep the existing `/ angler` · `/ private group` · `/ entire boat` · `/ person` suffix logic untouched.

3. Audit other card/grid surfaces that show prices and may use the same precomputed label or call `formatPrice` at module scope, and convert them to `useFormattedPrice` if found (Featured grid on home + category pages). Booking/checkout pages already use `useFormattedPrice`/`OrderTotal` (store-subscribed) so no change expected — verify only.

## Out of scope

- No DB or pricing-logic changes.
- No changes to FX rates loader, listing trip cards, or checkout math.