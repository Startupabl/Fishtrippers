## Restore "From" prefix on operator cards

**File:** `src/components/listings/OperatorCard.tsx`

In the price block, prepend `From ` before the `<PriceLabel />` output so cards read:
- `From $800.00 / entire boat`
- `From $150.00 / angler`
- `From $400.00 / private group`

## Confirm lowest-price logic

Already implemented in `src/lib/operators-search.functions.ts` — the loop iterates all active trips and keeps the cheapest:

```ts
for (const t of candidates) {
  const p = cardPriceFor(t);
  ...
  if (!cheapest || p < cheapest.price_minor) {
    cheapest = { price_minor: p, currency: t.currency, is_shared, is_private_group };
  }
}
```

So in your example (full day $1,700 + half day $800 private charter), the card will show `From $800.00 / entire boat`. The suffix follows whichever trip wins on price. No change needed here — just verifying.

**Note:** if a captain mixes a shared trip and a private trip on the same listing, the cheapest one's label wins (e.g. a $50/angler shared could outprice a $400/boat private and the card would say `From $50.00 / angler`). Let me know if you want same-type-only comparison instead.
