## Goal
On Step 4 (Fishing Focus), the old "Primary Category" section (5 cards: Inshore / Offshore / Freshwater / Fly Fishing / Spearfishing) becomes redundant now that we have a richer **Fishing Environments** multi-select. We remove the primary-category section entirely, and visually upgrade the Environments grid to match the polished look of the old category cards (icons, two-column grid, check badge, hover/selected states).

## Changes

### 1. `src/lib/operators.shared.ts`
- Extend `FISHING_ENVIRONMENTS` entries with an `icon` field (lucide-react component) so the UI doesn't hard-code a mapping:
  - Inshore → `Fish`
  - Nearshore → `Sailboat`
  - Offshore / Deep Sea → `Waves`
  - Flats → `Sun`
  - Freshwater → `Trees`
  - Rivers & Streams → `Mountain`
  - Backcountry → `TreePine`
- Add a small helper `primaryCategoryFromEnvironments(envs: string[]): PrimaryCategory` that maps the first selected env to a legacy `PrimaryCategory` (nearshore/flats/backcountry → `inshore`, rivers_streams → `freshwater`, offshore → `offshore`, freshwater → `freshwater`, inshore → `inshore`). Defaults to `inshore` if empty.
- Keep `PRIMARY_CATEGORIES`, `PRIMARY_CATEGORY_DETAILS`, and `submitOperatorSchema.primary_category` as they are — DB column and existing filters/search/trip code still rely on it.

### 2. `src/stores/useOperatorOnboardingStore.ts`
- In `toggleEnvironment` (and wherever environments change), auto-set `primary_category = primaryCategoryFromEnvironments(envs)`.
- Update `isFishingFocusValid` to drop the explicit `primary_category` check (validity now = ≥1 environment AND ≥1 species). `primary_category` is always derived, so it's implicitly satisfied.

### 3. `src/components/operator-onboarding/steps/FishingFocusStep.tsx`
- Delete the entire "Primary category" section (lines ~49–95) and its `CATEGORY_ICON` map / `PRIMARY_CATEGORIES`, `PRIMARY_CATEGORY_DETAILS`, `setPrimaryCategory` imports.
- Restyle the Fishing Environments grid to match the old category cards:
  - 2-column responsive grid (`sm:grid-cols-2`).
  - Each card: lucide icon (from the new `icon` field) on the left, label + description on the right, `CheckCircle2` badge in the top-right when selected, `border-primary bg-primary/5` selected state, `hover:border-primary/40` idle state.
- Header copy stays: "Pick every environment you fish. At least one is required."
- Counter chip ("N selected") stays.

### 4. No DB migration
The `operators.primary_category` column stays and is still written on submit (auto-derived). Search filters, trip-suggestion logic, and listing pages keep working with zero changes.

### Out of scope
- `TripCatalogStep`, listing pages, admin views, and search filters that read `primary_category` are untouched — they continue to work because the value is auto-derived from environments.

## Acceptance
- Step 4 shows only two sections: **Fishing Environments** (with icons) and **Targeted Species**.
- Selecting at least one environment + one species enables Continue.
- Saving the draft and re-opening Step 4 restores the selected environments; the operator's `primary_category` in DB reflects the first selected environment via the mapping.
