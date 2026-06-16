## Fix preview-page button colors and fish icon alignment

### 1. Brand-gold buttons on `/operator/preview`

Replace the amber Tailwind classes on the two CTAs with the existing gold tokens already used by the header.

- `src/components/operator-listing/HeaderGallery.tsx` (line 41) — "Select your trip" button:
  - From: `className="bg-amber-500 text-black hover:bg-amber-600"`
  - To: `className="bg-gold text-ocean-deep hover:bg-gold-deep"`
- `src/components/operator-listing/TripsBlock.tsx` (line 80) — "View availability" button:
  - Same swap as above.

These match the gold used in the header and the recently updated PreviewBanner buttons, so the entire preview page reads as one gold set.

### 2. Fish icons "zigzagging" — align the row

Each species PNG has a different intrinsic aspect ratio / content placement, and the current container is `h-20 w-20` with `object-contain`. Because the labels sit below and cards stretch, icons appear to drift up/down across the row.

Fix in `src/components/operator-listing/SpeciesGrid.tsx`:

- Replace the per-card `flex flex-col items-center gap-3` with a layout that anchors the image area to a fixed centered box and the label to a fixed baseline:
  - Card: keep `flex flex-col items-center` but use a fixed image slot `h-24 w-24` with `flex items-center justify-center` (already there) and add `shrink-0`.
  - Image: keep `object-contain` and add `object-center` explicitly, plus `mx-auto block` to guarantee horizontal centering regardless of intrinsic width.
  - Wrap the label in a fixed-height row (`h-5 leading-5`) so cards of varying icon heights don't shift the label baseline.
- Add `items-stretch` on the grid so all cards share equal height; this removes the visible zigzag along the row.

No asset changes — purely CSS centering and consistent slot heights.

### Files touched

- `src/components/operator-listing/HeaderGallery.tsx`
- `src/components/operator-listing/TripsBlock.tsx`
- `src/components/operator-listing/SpeciesGrid.tsx`
