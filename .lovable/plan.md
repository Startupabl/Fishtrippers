## Goal

On operator cards, when the operator is a guide (not a charter), replace the boat icon + vessel length (e.g. 🚤 24 ft) with a footprint icon + the word "Guide".

## Changes

**1. `src/lib/operators-search.functions.ts`**
- Add `business_type: "charter" | "guide" | null` to `OperatorCardDTO`.
- Include `business_type` in the `operators` select.
- Map `business_type: row.business_type ?? null` in the DTO mapper.

**2. `src/components/listings/OperatorCard.tsx`**
- Import `Footprints` from `lucide-react`.
- Replace the current "length" segment logic with:
  - If `operator.business_type === "guide"` → push a segment with `<Footprints className="size-4 text-foreground" />` and `<span>Guide</span>`.
  - Else if `vessel_length_ft != null` → existing Sailboat + "X ft" segment.

No DB, RLS, or server-route changes — `business_type` already exists on `operators`. Capacity, verified, and other pills are unchanged.
