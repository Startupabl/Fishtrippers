## Plan: Deposit/Balance breakdown per Trip card

Edit only `src/components/operator-listing/TripsBlock.tsx` (the `TripCard` subcomponent). All math stays local to each `TripCard`, so guest/currency changes in one card never affect siblings.

### Changes

1. In `TripCard`, after computing `totalMinorBase`, also compute:
   - `depositMinorBase = Math.round(totalMinorBase * 0.10)`
   - `balanceMinorBase = totalMinorBase - depositMinorBase`
   - Convert each through the existing `convertMinor(..., base, display)` (same path as `totalDisplay`), giving `depositDisplay` and `balanceDisplay`.

2. Replace the existing "Total for X guests" row (lines 226–240) with a high-contrast payment summary block, still inside the same `aside`, directly below the Guests stepper:

   ```
   ┌───────────────────────────────────────┐
   │ DUE NOW TO BOOK         {deposit}     │  ← prominent, accent bg
   │ Charged today to secure your spot     │
   ├───────────────────────────────────────┤
   │ Total trip cost         {total}       │
   │ Remaining balance       {balance}     │
   │ Paid directly to your guide when…     │
   └───────────────────────────────────────┘
   ```

   Implementation notes:
   - Outer wrapper: `mt-4 rounded-lg border` with the top "due now" panel using `bg-gold/15 text-ocean-deep` (reusing tokens already in this file) for high contrast; amount in `text-xl font-bold`.
   - Below the divider: two `flex justify-between` rows for Total and Remaining, plus the small "Paid directly to your guide when you meet." muted caption.
   - Keep the existing `<CurrencyDisclaimer baseCurrency={base} displayCurrency={display} />` below the block.
   - All amounts formatted via `formatCurrency(value, display)` (active currency symbol comes from the store, same as today).

3. No other components, props, server functions, or pricing math are touched. Booking flow (`CheckDatesDialog`, `RequestToBookDialog`) is unchanged — this is a presentation-only update.

### Out of scope
- Charging the deposit at checkout (this is display only, matching the request).
- Currency selector UI (already wired via `useCurrencyStore`).
