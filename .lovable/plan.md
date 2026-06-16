# Targeted Species — monochrome icon set + card redesign

## Scope
Replace the generic `Fish` lucide icon in the listing preview's "Targeted species" block with a custom set of monochrome, single-direction line-art icons — one per species in `SPECIES_CATALOG` (30 total) — and restyle the cards to match the reference aesthetic.

## 1. Generate icon assets (30 PNGs)

Create `src/assets/species-icons/` and generate one transparent PNG per species id in `SPECIES_CATALOG` (`src/lib/operators.shared.ts`, lines 60-94):

redfish, snook, tarpon, speckled_trout, flounder, permit, bonefish, mahi, tuna, marlin, sailfish, wahoo, grouper, snapper, kingfish, amberjack, swordfish, largemouth_bass, smallmouth_bass, trout, walleye, pike, musky, catfish, salmon, panfish, hogfish, lionfish, lobster

Generation rules (applied uniformly via `imagegen--generate_image`, fast tier, transparent background, 512x512):
- Minimalist black line-art illustration, single consistent line weight (~3-4px)
- Pure black strokes (`#0A0A0A` to match the boat-icon black), no fill, no color, no shading
- Side profile, **all facing left** (same orientation rule as boat icons)
- Centered with even padding, clean negative space, no text/labels/background elements
- Style cue: "matches a uniform set of monochrome line icons; like the boat icon set"

## 2. Build a species → icon registry

New file `src/assets/species-icons/index.ts`:
- Import each PNG and export `SPECIES_ICONS: Record<string, string>` keyed by species id
- Export a `getSpeciesIcon(id)` helper with a graceful fallback (returns `undefined` if unknown, so the card can fall back to the lucide `Fish`)

## 3. Redesign `SpeciesGrid.tsx`

Update `src/components/operator-listing/SpeciesGrid.tsx`:
- Replace the round `bg-muted` circle + lucide `Fish` with a larger square-ish icon area inside a soft, light card
- Card: `rounded-2xl border bg-card/60` (light, airy), hover lift, generous padding
- Icon: rendered as `<img>` ~80×80, centered, with subtle inner spacing
- Label: centered below, `text-sm font-medium`
- Grid: keep responsive `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`, slightly larger gap (`gap-4`)
- Fallback to lucide `Fish` only when an icon isn't registered

No changes to data shape, store, or any other component — purely the icon set + this one card component.

## Files
- **Created**: `src/assets/species-icons/*.png` (×30), `src/assets/species-icons/index.ts`
- **Edited**: `src/components/operator-listing/SpeciesGrid.tsx`

## Out of scope
- Picker UI in `FishingFocusStep` (still uses text labels; can be a follow-up if you want icons there too)
- Adding/removing species from the catalog
