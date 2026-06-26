
## Scope

Guides only. Charters (Private Charter and Shared Tour) and the guide Small Group Trip flow are NOT changed.

For Guides, when "Private Trip" is selected, treat it like the existing Private Charter flow — a single flat group price with no "per additional angler" field — but with guide-specific labels and a new "/ private group" suffix on cards and listing pages.

## 1. `src/components/operator-onboarding/trips/TripFormDialog.tsx`

Add a `isPrivateGuideTrip = form.charter_type === "private_trip"` flag (guide private trip), and treat it the same as `isPrivateCharter` for pricing structure:

- **Base price label** (line ~510): when `isPrivateGuideTrip`, show `"Base Price (Per Group)"`. Charters and small_group_trip stay unchanged.
- **Helper text** (line ~550): when `isPrivateGuideTrip`, show "Total Trip Price (Private Group)" with subtext "The total trip price for booking this private group with a max group size of {max_party_size} anglers."
- **Hide "Price per additional angler"** (line ~560): extend the gate so the block is hidden when `isPrivateGuideTrip` (currently only hidden for `isPrivateCharter` and `small_group_trip`). Final condition: render only for `shared_tour`.
- **Capacity column** (line ~665, the non-shared branch): when `isPrivateGuideTrip`, change labels to **"Max Group Size"** and **"Min Group Size"** (charter private keeps "Max trip size" / "Min trip size").
- **`totalPreview`** (line ~265): treat `isPrivateGuideTrip` the same as `isPrivateCharter` — flat `price_minor`, no per-extra multiplication.
- **Total preview helper text** (line ~714): when `isPrivateGuideTrip`, show "Total Trip Price (Private Group)" with subtext "Flat rate for the entire group (up to {max_party_size} anglers)."
- **Trip-type select handler** (line ~301): add `private_trip` to the list that resets `per_extra_minor` to 0 and clears the extra input.

## 2. `src/lib/operators-search.functions.ts`

Add a `lowest_price_is_private_group: boolean` field to `OperatorCardDTO`. In the row mapper, set it true when the cheapest trip's `charter_type === "private_trip"`. For `private_trip` rows, the card price should be `price_minor` (flat group price), not `per_extra_minor` — update `cardPriceFor` so private guide trips return `price_minor`.

## 3. `src/components/listings/OperatorCard.tsx`

Update the price suffix logic:
- `lowest_price_is_shared` → `" / angler"`
- `lowest_price_is_private_group` → `" / private group"`
- else (private charter) → `" / entire boat"`

## 4. `src/components/operator-listing/TripsBlock.tsx`

In the price header (line ~181) and the popover details:
- Compute `isPrivateGroup = trip.charter_type === "private_trip"`.
- Suffix becomes: shared → `/ angler`, private group → `/ private group`, else → `/ entire boat`.
- In the popover, when `isPrivateGroup`, suppress the per-extra row (already suppressed because `perExtra` will be 0) and keep "Total trip price" using the flat base.
- Guest total math: when `isPrivateGroup`, total should be flat `price_minor` regardless of guest count (mirrors private-charter behavior, which currently uses `price_minor + perExtra * (guests-1)` and works because perExtra is 0 — so this already works once data is saved with `per_extra_minor = 0`). No math change needed beyond confirming `per_extra_minor` is 0.

## 5. Backfill (optional, only if needed)

Existing `private_trip` rows in `trip_packages` may have `per_extra_minor > 0` from before this change. If we want existing rows to display as flat group price immediately, run a one-line update setting `per_extra_minor = 0` for `charter_type = 'private_trip'`. Confirm before running.

## Out of scope

- Charters (Private Charter, Shared Tour): no changes.
- Guide Small Group Trip: no changes.
- Booking checkout math: already follows `per_extra_minor`, so setting it to 0 for private_trip yields the correct flat group total automatically.
