# Step 4: Fishing Focus

Insert a new step between **Boat details** and **Booking rules** capturing the operator's primary fishing category and target species. Drives search filters and pre-filters trip catalog templates in the next step of the funnel.

## Sidebar order (after change)

```
1. Business type
2. Profile
3. Boat details        (skipped for "guide")
4. Fishing focus       ← NEW
5. Booking rules
6. Review & submit
```

Applies to both `charter` and `guide` operators (no skip).

## Data model

Add two columns to `public.operators`:

- `primary_category` — enum `operator_primary_category` with values `offshore | inshore | freshwater | fly`. Nullable until submit.
- `target_species` — `text[]` default `'{}'`, stores species slugs from the catalog.

Migration steps: create enum, `ALTER TABLE operators ADD COLUMN ...`, add `CHECK (array_length(target_species, 1) >= 1)` only at submit-time (enforced in app, not DB, to keep drafts saveable). Add btree GIN-style index `CREATE INDEX operators_target_species_idx ON operators USING GIN (target_species)` and `operators_primary_category_idx` for search filters. No new RLS/grants needed — existing operator policies cover the columns.

## Species catalog (default, editable later)

Lives in `src/lib/operators.shared.ts` alongside the existing feature catalog. Slug + label; grouped so the UI can render section headers in the searchable cloud.

- **Offshore**: tuna, marlin, mahi, wahoo, sailfish, snapper, grouper, kingfish
- **Inshore**: redfish, snook, tarpon, sea_trout, flounder
- **Freshwater**: largemouth_bass, smallmouth_bass, rainbow_trout, walleye, northern_pike, musky, catfish, crappie, salmon
- **Fly**: trout_fly, bonefish, permit, tarpon_fly

Selecting a primary category does **not** restrict species (a freshwater guide may still tag a salt species if they cross over) — but the species list re-orders so the category's species appear first.

## UI — `FishingFocusStep.tsx`

- **Primary Category**: 4 large radio cards in a 2x2 grid (Offshore / Inshore / Freshwater / Fly), each with an icon + one-line description. Single-select, required.
- **Target Species**: search input + chip/checkbox cloud grouped by category. Selected chips show filled primary style; unselected are outlined. Counter shows "N selected". Required ≥ 1.
- Continue button disabled until both valid; matches existing step UX (Back / Continue footer).

## Wiring

- `useOperatorOnboardingStore`: add `primary_category`, `target_species: string[]`, setters, `isFishingFocusValid()`, include in `isReadyToSubmit`, `hydrateFromServer`, and `reset`.
- `mentor.create-path.tsx`: extend `STEP_ORDER` and `steps[]` to include `fishing_focus` between `boat_details` and `booking_rules`; no skip logic for guides on this step.
- `operators.shared.ts`: extend `operatorDraftSchema` and `submitOperatorSchema` with the two fields (nullable in draft, required + non-empty array in submit). Export `PRIMARY_CATEGORIES` and `SPECIES_CATALOG`.
- `operators.functions.ts`: `upsertDraft` and `submitOperator` already write the operator row — add the two new fields to the column lists.
- `ReviewSubmitStep.tsx`: render a "Fishing focus" summary row.

## Downstream pre-filtering (next step of funnel — Trip Catalog)

Out of scope for this turn (Trip Catalog UI doesn't exist yet), but the foundation is laid: when that step is built, it reads `operator.primary_category` and surfaces matching templates first. Search filter pages already planned will query `operators` by `primary_category` and `target_species && '{...}'`.

## Files

**New**
- `src/components/operator-onboarding/steps/FishingFocusStep.tsx`
- Migration: add enum, columns, indexes on `operators`

**Edited**
- `src/lib/operators.shared.ts` — catalog, schemas
- `src/stores/useOperatorOnboardingStore.ts` — state + validity
- `src/routes/mentor.create-path.tsx` — step order, render branch
- `src/components/operator-onboarding/steps/ReviewSubmitStep.tsx` — summary row
- `src/lib/operators.functions.ts` — persist new columns

## Out of scope

- Trip Catalog UI itself (separate step).
- Public search filter page changes (data is now available; UI lands when search page is built).
- Editable species catalog admin UI.
