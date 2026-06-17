Show "N Trip(s) Available" under the charter name on each `OperatorCard`, using the count of trip packages the operator has created.

**1. `src/lib/operators-search.functions.ts`**
- Add `trip_count: number` to `OperatorCardDTO`.
- In the row mapper, compute `trip_count = (active.length > 0 ? active.length : trips.length)` — matches the same "prefer active, fall back to all" logic already used for pricing, so newly approved listings still show a count.

**2. `src/components/listings/OperatorCard.tsx`**
- Just below the `<h3>` title (and above the city line), render:
  ```
  <Ship icon> {trip_count} Trip{trip_count === 1 ? "" : "s"} Available
  ```
  Hide the row entirely when `trip_count === 0`.
- Use the `Ship` lucide icon at `size-3.5`, styled like the existing city/instant-confirm rows (`mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground`).

No other changes (capsule, pricing, layout untouched).