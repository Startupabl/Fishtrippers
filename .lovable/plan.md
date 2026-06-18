## Goal
Drastically improve the readability and layout of the Trip Pricing / Payment Summary box inside each trip card on the listing page, matching the Fishtrippers reference image while keeping the existing 10% deposit / 90% balance math and site color palette.

## Target file
- `src/components/operator-listing/TripsBlock.tsx` (the `TripCard` inner component, specifically the right `aside` pricing block)

## Changes to make

### 1. Widen the pricing column
- Change the parent grid from `lg:grid-cols-[minmax(0,1fr)_260px]` to `lg:grid-cols-[minmax(0,1fr)_360px]` so the pricing block has room to breathe on desktop.
- Add `min-w-[360px]` (or `min-w-[320px] sm:min-w-[360px]`) to the right `aside` to satisfy the requested 360–400px minimum width.

### 2. Increase padding
- Increase the right `aside` padding from `p-4` to `p-5` (20px).
- Increase the payment summary container padding so it is no longer cramped.

### 3. Fix typography hierarchy
- Remove all `text-[11px]` and `text-xs` inside the payment summary area.
- Set the base summary text to `text-sm` (≈14px) or `text-[15px]`.
- "DUE NOW TO BOOK" text: `text-sm`/`font-bold`/`uppercase`/`tracking-wide`.
- Deposit price: `text-2xl`/`font-extrabold` (≈20px+).
- Total cost / remaining balance rows: `text-sm`/`font-medium` labels with `font-semibold` prices.

### 4. Restructure the payment summary as a distinct callout card
- Wrap the whole payment summary in a rounded bordered container (`rounded-xl border`).
- Give the deposit section its own full-width highlighted background card (`bg-gold/20 text-ocean-deep`) with generous internal padding.
- Stack "DUE NOW TO BOOK" label above the large deposit price, not side-by-side, to match the reference image and avoid wrapping.
- Keep the "Charged today to secure your spot" sub-line below the deposit price.

### 5. Prevent awkward text wrapping
- For the "Total Trip Cost" and "Remaining Balance" rows, use `flex items-center justify-between`.
- Place the descriptive text on the left and the converted price on the right.
- Apply `whitespace-nowrap` to each price element so it never breaks onto a second line.
- Remove the `({guests} guest…)` detail from the label or keep it compact so the label itself does not fight the price for space.

### 6. Match site colors
- Deposit callout uses existing brand tokens: `bg-gold/20` (or `bg-gold/15`) + `text-ocean-deep`.
- Keep the gold CTA button (`bg-gold text-ocean-deep`) and the existing `CurrencyDisclaimer` below unchanged.
- Do not introduce new hardcoded colors; rely on existing `gold`/`ocean-deep`/`muted-foreground` tokens already defined in `src/styles.css`.

## Out of scope
- No changes to deposit/balance math (already 10% / 90%).
- No changes to currency conversion, booking dialogs, or server functions.
- No changes to the left-side trip content or the `TripsBlock` list wrapper.

## Acceptance criteria
- On desktop, the pricing block is ≥360px wide, padding is 20px, and no summary text is smaller than 14px.
- The deposit price is large and bold; the deposit callout is visually distinct.
- "Total Trip Cost" and "Remaining Balance" rows sit on single lines with price on the right and no wrapping.
- The UI still matches the site's gold + navy color scheme.