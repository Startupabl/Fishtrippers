## Goal

Decouple target species from primary category. Replace the grid-of-pills picker in onboarding with a single searchable multi-select that renders selections as removable pills. On the public listing, keep the existing card grid but show only the centered species name (no icons, no fish photos, no background image).

## Changes

### 1. New flat species catalog — `src/lib/operators.shared.ts`
- Add `SPECIES_LIST: string[]` — the 97 species you provided, alphabetical, exactly as written (parentheses preserved, e.g. `"Bass (Largemouth)"`).
- Add helper `speciesIdFromLabel(label)` → slug (lowercase, non-alphanumerics → `_`) and `speciesLabelFromId(id)` that reverses via lookup. Stored value in `operators.target_species` stays an array of slugs (keeps existing DB rows valid; old slugs that don't match the new list just render as their slug string fallback, same behavior as today).
- Keep `SPECIES_CATALOG` and `speciesForCategory` exported but mark deprecated; `speciesLabel(id)` now resolves against the new flat list first, then falls back to the legacy catalog, then to the raw id.
- No change to `primary_category` — it stays as its own independent field/section.

### 2. New onboarding control — `FishingFocusStep.tsx`
Replace the entire "Target species" section (the search input + grouped pill grid, lines ~127–185) with a `SpeciesMultiSelect` component:

- Single `Input` labeled "Targeted Species" with placeholder "Start typing a species…".
- As the captain types, a dropdown (Popover/Command from shadcn `cmdk`) lists matching species alphabetically — case-insensitive substring match, capped at ~50 results, excludes already-selected.
- Enter or click adds the species. Selected species render below the input as removable pills (`Badge` with an `X` button).
- Counter "N selected" stays.
- Primary-category section is untouched; the dropdown shows the full list regardless of category.

### 3. Remove fish-icon visuals on the listing — `SpeciesGrid.tsx`
- Drop the `Fish` icon, `getSpeciesIcon` import, and the circular muted thumbnail.
- Keep the same card grid (2/3/4 columns) but each card becomes a square (`aspect-square`) with the species name centered (`flex items-center justify-center`, `text-center`, `font-medium`).
- No background image, no photo, no icon — just the centered label on the card surface.
- This also resolves the earlier "grey circles hide the fish" concern; the icon assets remain on disk but are no longer imported here.

### 4. No DB migration
`operators.target_species` is already `string[]`. The existing data continues to work; new selections just use the new slug set.

## Technical notes
- The dropdown uses `Command` + `Popover` (already in shadcn ui).
- Zod schema `target_species: z.array(z.string()).min(1).max(50)` is unchanged.
- `mentor.create-path.tsx` and `operators.functions.ts` continue to pass `target_species` through untouched.

## Out of scope
- No changes to search cards yet (that comes when we wire species into the search filter UI).
- Not deleting the species-icon asset files — leaving them in case you want them elsewhere later.
