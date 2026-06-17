## Goal
Make the info capsule on `OperatorCard` larger, centered horizontally over the bottom of the cover image, with a bigger boat-type icon and three segments: boat size, capacity, verified.

## Changes — `src/components/listings/OperatorCard.tsx` only

- Container row: change `inset-x-3 bottom-3 flex` to `inset-x-0 bottom-4 flex justify-center px-4`, so the capsule centers and breathes from the edges.
- Capsule: bump from `text-xs` / `py-1.5` to `text-sm font-semibold`, `py-2.5 px-1`, with a slightly thicker shadow (`shadow-md`). Target width ≈ 2/3 of card: add `w-[66%] min-w-[220px] max-w-[320px]` and `justify-around` so the three segments space evenly.
- Segments: each segment becomes `flex-1 justify-center gap-2 px-3 py-1`, dividers stay as `border-l border-border/70`.
- Boat icon: render at `size-7` (image) instead of `size-4`, with `object-contain`. Lucide fallback also `size-6`. This matches the prominent boat silhouette in the reference.
- People icon: `size-5`.
- Rebuild the three fixed segments (drop the rating segment entirely for now):
  1. Boat icon + `{length_ft} ft`
  2. People icon + `{capacity}`
  3. Filled amber star + `Verified` label (only when `operator.verified` true — which is currently always true for approved listings)
- Each segment only renders if its data is present; if length or capacity is missing, that segment is omitted but the capsule still centers.

No data/server changes needed — `verified` is already on the DTO and `boat_type_icon_url` is already wired.

## Out of scope
- Real review ratings/counts (still deferred).
- Any change to title row, price row, or image.
