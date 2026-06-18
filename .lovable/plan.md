## Goal
In the Trip Creation form (`src/components/operator-onboarding/trips/TripFormDialog.tsx`), replace the single "Total at full trip" preview line at the bottom of the Pricing section with a clear 3-step math breakdown plus a footnote.

## Changes
File: `src/components/operator-onboarding/trips/TripFormDialog.tsx`

Replace the existing `{totalPreview != null && ...}` block (currently a single line showing "Total at full trip … {amount}") with a stacked breakdown rendered whenever `totalPreview != null`:

1. **Total Trip Price (Full Boat)** — `base_price + (max_party_size − 1) × per_extra` (already computed as `totalPreview`). Label "Total Trip Price (Full Boat)", subtext "Assumes the trip is booked to your max party size of {N} guests."
2. **Deposit to Fishtrippers (10%)** — `Math.round(totalPreview * 0.10)`. Subtext: "Paid by the customer online at booking."
3. **Your Take-Home Cash (90%)** — `totalPreview − deposit`. Subtext: "Paid directly to you by the customer when you meet."

Visual: stacked rows inside the existing `rounded-lg border bg-background p-3` card, each row with label + subtext on the left and money on the right; the take-home row emphasized (font-semibold, larger). Separator above the take-home row.

Footer note below the card (muted, text-xs):
> "Fishtrippers collects our 10% matchmaking fee upfront from the customer's deposit. You collect the remaining 90% balance when you meet."

Currency uses the existing `captainCurrency` + `formatMoney` helpers already imported in the file. No schema, no server-fn, no DB changes — purely a presentational update inside the existing Pricing section.

## Out of scope
- Storing the split in DB (math is derived at display time).
- Public listing page pricing display (`TripsBlock.tsx`) — this request is scoped to the captain's trip creation form.
- Changing the 10% platform fee value (hardcoded here; if it should read from `platform_settings`, flag as follow-up).