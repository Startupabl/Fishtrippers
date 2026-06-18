## Goal
Make the search Target Fish filter list complete (all 85+ species the database supports) and rename the Category pill label to "Trip Type".

## Changes

### 1. `src/lib/trip-filters.ts` — derive species from the canonical catalog
- Import `SPECIES_LIST` and `speciesIdFromLabel` from `@/lib/operators.shared`.
- Replace the hand-written 14-item `SPECIES_OPTIONS` with one generated from `SPECIES_LIST`, sorted alphabetically:
  ```ts
  export const SPECIES_OPTIONS: FilterOption[] = SPECIES_LIST
    .map((label) => ({ slug: speciesIdFromLabel(label), label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  ```
  This guarantees the search filter slugs (`tuna_yellowfin`, `redfish_red_drum`, …) match exactly what listings save in `trip_packages.target_species`, so `.overlaps()` actually returns hits.

### 2. `src/lib/trip-filters.ts` — fix techniques alignment (same root issue)
- Replace `TECHNIQUE_OPTIONS` with one derived from `FISHING_TECHNIQUES` (the same canonical list used in the trip form) so technique filtering also matches stored values:
  ```ts
  export const TECHNIQUE_OPTIONS: FilterOption[] = FISHING_TECHNIQUES.map((t) => ({
    slug: t,        // stored verbatim in trip_packages.techniques
    label: t,
  }));
  ```

### 3. `src/routes/search.tsx` — rename pill label
- Line ~299: change the fallback label from `"Category"` to `"Trip Type"`.
- Line ~161: change the "All categories" default text shown in the pill (and the popover header if it says "All categories") to `"All trip types"` so the label stays consistent. Underlying URL param stays `category`; only the visible text changes.

### Target Fish UX note
The Target Fish popover already has a search input and scrollable checkbox list, so going from 14 → ~95 options needs no layout change — just confirm the popover content uses `max-h` + `overflow-y-auto` (it does today). If not visibly scrollable after the change, add `max-h-80 overflow-y-auto` to the list wrapper.

## Out of scope
- No DB migration. No change to onboarding/trip-creation forms.
- No change to the `category` URL param name or routing logic.
