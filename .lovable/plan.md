## Boat icon restyle + sizing fix

### 1. Regenerate the 30 boat-type icons
- Switch from gold (#D4AF37) line-art to **solid black silhouette** style matching the reference card (filled black boat profile, side-view, no outline strokes, transparent PNG on white background).
- Re-run `imagegen` (fast tier, transparent background) for all subcategories under `src/assets/boat-icons/` — overwrite the existing files so `boat_types.icon_url` rows don't need to change.
- Prompt template per icon: "Minimalist solid black silhouette of a [boat subtype], side profile view, filled flat shape, no outline, no text, no background, centered, on a clean white background."

### 2. Fix rendering size in the Boat Type dropdown
Current: `BoatDetailsStep.tsx` renders the icon at ~20px which makes it look like a thin horizontal sliver because the source PNGs are square but the boat shape only occupies the middle band.

Changes in `BoatDetailsStep.tsx`:
- Bump dropdown icon size to **40×24** (`h-6 w-10`), `object-contain`, so the silhouette has room to breathe and matches the proportions in the reference card.
- Same treatment in the selected-value display (trigger).

### 3. Out of scope (deferred to search-card step)
- Adding the icon + "X ft / Up to Y people" block to public search/listing cards — we'll wire that in when we build the search results UI. This task only adjusts the onboarding dropdown preview and the source asset style/color.

### Files touched
- `src/assets/boat-icons/*.png` (regenerated, ~30 files)
- `src/components/operator-onboarding/steps/BoatDetailsStep.tsx` (icon sizing)

No DB migration, no schema change.
