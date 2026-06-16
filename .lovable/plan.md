# Boat Details — Revamp Plan

## 1. New section layout (charter only)

Replace the current "Specs / Boat Features" layout with six sections matching the reference screenshots:

**A. Boat Info** — Select Boat Type (new grouped dropdown), Manufacturer, Select Length (dropdown 4–150 ft), Model Year (dropdown current year → 1900), `Restored` checkbox.

**B. Engine** — Engine Manufacturer, Number of Engines, Horsepower per Engine, Maximum Cruising Speed (knots, with suffix).

**C. Max Passenger Capacity / Number of Seats** — kept exactly as-is (label, helper text, numeric input, validation rule).

**D. Navigation** — checkboxes: GPS, Fishfinder, VHF Radio, Radar.

**E. Facilities** — checkboxes: Flybridge, Toilet, Shower, Kitchen, Bed, Wheelchair Accessible.

**F. Features** — checkboxes: Air Conditioning, Multimedia System, TV, Wireless Trolling Motor, Refrigerator, Ice-Box.

**G. Gear & Crew** — checkboxes: Fighting Chair, First Mate, Livewell/Live Bait Tank, Spearfishing Equipment, Snorkeling Equipment, Outriggers, Downriggers, Tuna Tubes.

## 2. "Add comment" behavior

Every checkbox in D–G shows an inline "Add comment" link once checked. Clicking it reveals a small text input (max **50 chars**, live counter). Comments persist with the listing and render on the public listing page later.

Data shape: replace `vessel.features: string[]` with `vessel.features: Record<string, string>` (key = feature id, value = comment, empty string allowed). Migrate `vessels.features` column from `text[]` to `jsonb` (default `'{}'::jsonb`).

## 3. Boat Type dropdown

New table `public.boat_types`:
- `id` (text PK, e.g. `center_console`)
- `category_group` (text, e.g. "Center Console Boats")
- `subcategory_name` (text, e.g. "Center Console")
- `icon_url` (text)
- `sort_order` (int)

Seeded with the full category list provided. RLS: public read (`SELECT to anon, authenticated`), no writes from client.

Dropdown UI: built with shadcn `Select` using grouped `SelectGroup` + `SelectLabel` (non-selectable bold headers) and `SelectItem` (selectable subcategories). Headers are visually distinct and cannot be clicked. Selected option shows the icon + name; chosen icon also surfaces later on the operator profile and listing cards.

New vessel field `boat_type_id` (text, FK → `boat_types.id`).

## 4. Icon generation (Brand Gold #D4AF37 line-art)

Generate one minimalist line-art SVG-style PNG per subcategory (~27 icons) with `imagegen` (fast tier, transparent background, white reference background in prompt). Saved to `src/assets/boat-icons/<id>.png` and uploaded to Lovable Assets; resulting URLs seeded into `boat_types.icon_url`. Icons render at ~20px in the dropdown / cards.

> Note: ~27 image generations is the slow part of this task; everything else is wiring.

## 5. Length & Year dropdowns

- **Length**: shadcn `Select`, options `4 ft` … `150 ft` (integers). Stored as number in `length_ft`.
- **Year**: shadcn `Select`, options from current year down to `1900`. Stored as integer string in `year`.

## 6. Schema / code changes

**Migration** (single file):
- `CREATE TABLE public.boat_types` + GRANT + RLS + seed rows.
- `ALTER TABLE public.vessels ADD COLUMN boat_type_id text REFERENCES public.boat_types(id)`.
- `ALTER TABLE public.vessels ADD COLUMN restored boolean DEFAULT false`.
- `ALTER TABLE public.vessels ADD COLUMN num_engines int`, `horsepower_per_engine int`, `max_cruising_speed_knots numeric`.
- Convert `vessels.features` from `text[]` → `jsonb` (default `'{}'`); existing rows mapped `array → object with empty comments`.
- (Existing `engine_type` / `engine_size` columns stay nullable, no longer surfaced in the form.)

**`src/lib/operators.shared.ts`**:
- Replace `BOAT_FEATURE_GROUPS` with the new four groups (Navigation, Facilities, Features, Gear & Crew).
- Update `vesselDraftSchema` & `submitOperatorSchema.vessel`:
  - `boat_type_id: z.string().min(1)` (required on submit)
  - `restored: z.boolean()`
  - `num_engines`, `horsepower_per_engine`, `max_cruising_speed_knots` (optional numbers)
  - `features: z.record(z.string().max(50))` replacing the array
  - Drop `engine_type`/`engine_size` from required fields.

**`src/stores/useOperatorOnboardingStore.ts`**:
- `VesselDraftState`: add new fields, change `features` to `Record<string,string>`.
- Replace `toggleFeature(id)` with `toggleFeature(id)` (adds/removes key) and new `setFeatureComment(id, text)`.
- `isBoatDetailsValid`: require `boat_type_id` and `max_passenger_capacity`.

**`src/lib/operators.functions.ts`**:
- Include new vessel columns in draft + submit upserts; persist `features` as jsonb object.

**`src/components/operator-onboarding/steps/BoatDetailsStep.tsx`**:
- Rebuild UI per section layout above.
- New `<BoatTypeSelect>` subcomponent fetching `boat_types` via a small `createServerFn` (`listBoatTypes`, public).
- New `<FeatureCheck>` row component: checkbox + label + "Add comment" toggle + 50-char `Input` with counter.
- Replace number inputs for length/year with `Select`s.

**`src/components/operator-onboarding/steps/ReviewSubmitStep.tsx`**:
- Show boat type (name + icon), restored flag, new engine fields, and per-feature comments in the summary.

## 7. Out of scope (this change)

- Rendering boat-type icon on the public operator profile / listing cards (data is ready; UI hookup happens when those screens are next touched).
- Filtering by boat type in search.

## Technical notes

- `boat_types` is a small reference table; fetched once on step mount and cached in React Query (`staleTime: Infinity`).
- The grouped `Select` uses `SelectGroup`+`SelectLabel` from shadcn; `SelectLabel` is not focusable/selectable by default — verifies the "category headers not clickable" rule.
- Migration converts `features` array → object with `jsonb_object_agg(unnest, '')` to keep existing draft data.
- Comment inputs use a controlled `Input` with `maxLength={50}` and a `{value.length}/50` counter; empty string = no comment.
