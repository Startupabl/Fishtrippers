## Price details popover

Add an `Info` icon (lucide-react) right next to the price in the trip card header (top-right), opening a small popover with a structured price breakdown.

### Placement

In `src/components/operator-listing/TripsBlock.tsx`, the header price block currently shows just `formatCurrency(baseDisplay, display)` on the right. We'll wrap it so the price stays visible and add an info button immediately to its right.

The info button is rendered inside the existing toggle `<button>`, so we stop click propagation to avoid collapsing the card when the popover is opened.

### Popover content

Uses shadcn `Popover` (`src/components/ui/popover.tsx`) anchored to the info icon. Layout mirrors the reference image but uses our site tokens (no red, no raw hex). Width ~ 320px.

Rows (pulled from existing `trip` data on the card):

```
Price details                                [popover]
────────────────────────────────────────────
1 person                              US $220
+1 additional person                  US $220   (only if per_extra_minor > 0)
────────────────────────────────────────────
Total trip price                      US $440
Shared trip, up to {maxParty} guests

The base price is for 1 person. After that
it's {extra} per additional guest, per trip.

Minimum {minParty} guests required.   (only if minParty > 1)
```

Rules:
- "Total trip price" = price for 1 person (matches the headline price), per user choice.
- "+1 additional person" row is hidden when `per_extra_minor` is 0/null.
- "Shared trip" subtitle is hidden when `max_party_size` is missing.
- Minimum-guests line is hidden when `minParty <= 1`.
- All currency values use the existing `formatCurrency` + `convertMinor` pipeline so the display currency stays in sync with the rest of the card.

### Styling (site tokens, no custom colors)

- Container: `Popover`'s default `bg-popover text-popover-foreground border` with `rounded-lg shadow-md` (already in `popover.tsx`).
- Title: `text-base font-semibold text-foreground`.
- Row labels: `text-sm text-foreground/80`. Row values: `text-sm font-semibold text-foreground` (right-aligned, `whitespace-nowrap`).
- Dividers between rows: `border-t border-border`.
- "Total trip price" row: `font-bold text-foreground`.
- Helper paragraph: `text-xs text-muted-foreground`.
- Minimum-guests line (replaces the red text in the reference): `text-xs font-medium text-destructive` — `--destructive` is our site's semantic red token, so it stays on-brand.
- Info icon button: `h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted` with `aria-label="View price details"`. Icon `Info` from `lucide-react`, `h-4 w-4`.

### Files

- `src/components/operator-listing/TripsBlock.tsx`
  - Import `Info` from `lucide-react` and `Popover, PopoverContent, PopoverTrigger` from `@/components/ui/popover`.
  - Wrap the price `<div>` in a `flex items-center gap-1.5` row with the price + info icon button.
  - Add the `Popover` with `onClick`/`onPointerDown` stop-propagation on the trigger so toggling the popover doesn't expand/collapse the card.

No new files, no backend changes, no schema changes. Pure presentation update inside the existing trip card header.
