# Search Directory Filter Overhaul

Goal: replace the placeholder filter pills on `/search` with a fully-wired, instantly-reactive filter set that maps 1:1 to the data captains enter on a trip package.

## 1. UI cleanup (`src/routes/search.tsx`)

- Remove the disabled "Sort by Recommended" pill.
- Remove the disabled generic "Filters" pill.
- Keep the existing Instant Book toggle and Category popover.
- Replace each `comingSoon` pill with a real popover-driven control: Duration, Departure Time, Price, Technique, Target Fish.
- Each control shows its current selection inline ("3 hrs", "$500 – $1,000", "6:00 AM", "2 selected") and an "active" style when set; a small × clears just that filter.
- Add a single "Clear all filters" link in the row when any trip-level filter is active.

No sidebar — keep the existing single-row filter strip above the results grid for visual consistency.

## 2. New URL search params (typed via Zod `validateSearch`)

Extend the existing `searchSchema` in `src/routes/search.tsx`:

- `duration`: `""` | `"1"`..`"14"` (hours, exact match)
- `departureTime`: `""` | `"HH:MM"` (24h, exact match against `trip_packages.start_time`)
- `priceMin`: number, default `0`
- `priceMax`: number, default `5000` (UI treats `5000` as "5000+", i.e. no upper bound when at max)
- `technique`: comma-separated slugs, e.g. `"fly,trolling"`
- `species`: comma-separated slugs, e.g. `"redfish,tarpon"`

Drop the old single `priceRange` / `technique` / `species` string fields (replace, not duplicate). All state lives in the URL so back/forward and shareable links work.

## 3. Filter controls

**Duration** — native `<select>` (or shadcn Select) with options `1 hr` … `14 hrs` and an "Any duration" reset. Maps to `trip_packages.duration_minutes = hours * 60` (exact).

**Departure Time** — Select with exactly these options (label → value stored):
`5:00 AM→05:00`, `5:30 AM→05:30`, `6:00 AM→06:00`, `6:30 AM→06:30`, `7:00 AM→07:00`, `7:30 AM→07:30`, `8:00 AM→08:00`, `9:00 AM→09:00`, `10:00 AM→10:00`, `12:00 PM→12:00`, `1:00 PM→13:00`, `2:00 PM→14:00`, `4:00 PM→16:00`, `6:00 PM→18:00`. Exact match on `trip_packages.start_time`.

**Price** — popover containing:
- Preset badge buttons: `Under $500` (0–500), `$500 – $1,000`, `$1,000 – $2,000`, `$2,000+` (2000–5000).
- Dual-handle slider (shadcn `Slider` with two thumbs), min 0, max 5000, step 50.
- Presets and slider are bound to the same `priceMin`/`priceMax` state — clicking a preset updates the slider and vice versa. When `priceMax === 5000` the label and query treat it as "no upper limit".
- Maps to `trip_packages.price_minor` between `priceMin*100` and (if not "+") `priceMax*100`.

**Fishing Technique** — popover with a checkbox list. Seed options (rendered as a fixed list — these match the onboarding template values):
`Fly Fishing, Trolling, Jigging, Bottom Fishing, Deep Drop, Casting, Drift Fishing, Live Bait, Spearfishing, Kite Fishing`.
Multi-select; stored as a slug array. Maps to `trip_packages.techniques && ARRAY[...]` (Postgres array overlap via PostgREST `overlaps`).

**Target Fish** — popover with a search input + checkbox list. Seed options:
`Redfish, Speckled Trout, Tarpon, Snook, Tuna, Marlin, Kingfish, Mahi Mahi, Snapper, Grouper, Cobia, Bass, Sailfish, Wahoo`.
Multi-select; stored as a slug array. Maps to `trip_packages.target_species` via overlap.

## 4. Server function rewrite (`src/lib/operators-search.functions.ts`)

The current query selects `operators` and pulls trips as a child. To filter on trip-level fields, switch the strategy:

- Extend `searchSchema` with: `duration` (number|null, minutes), `departureTime` (string|null, `HH:MM`), `priceMinMinor`, `priceMaxMinor` (numbers|null), `techniques` (string[]|null), `species` (string[]|null).
- When ANY trip-level filter is present, use a PostgREST inner join: `trip_packages!inner(...)` and apply `.eq`, `.gte`, `.lte`, `.overlaps` against the nested relation. This returns only operators that have at least one matching trip, and the returned `trip_packages` array contains only those matching rows so the price label reflects the filtered set.
- When no trip-level filter is present, keep the existing left-join behavior so all listings still show a "From $…" price.
- Operator-level filters (city/state/country/category/instantBook/q) keep working unchanged.
- Limit/order unchanged.

## 5. Reactive query wiring

In `src/routes/search.tsx`:

- Add every new search param to the `useQuery` queryKey so any change refetches immediately. Pass them through to `searchFn` (duration → minutes; priceMin/Max → minor units; technique/species → split CSV to array; treat `priceMax === 5000` as no upper bound).
- Filter changes write to the URL via `setSearch(...)` (already implemented), which re-renders the route and re-runs the query — no page reload. Keep `replace: true` so back/forward isn't polluted.

## 6. Out of scope (call out)

- No DB migration: all fields already exist on `trip_packages`.
- No new server-side sort (Recommended dropdown is simply removed; existing `featured → priority_order → created_at` order remains).
- Technique/species seed lists are hard-coded constants in a new `src/lib/trip-filters.ts` (slug + label); we can swap to a DB-driven list later if onboarding starts persisting a canonical taxonomy.

## Technical notes

- PostgREST array overlap: `.overlaps('techniques', ['fly','trolling'])`.
- `trip_packages.start_time` is `time without time zone` — compare as `HH:MM:SS` (`'06:00:00'`).
- Dual-handle slider: shadcn `Slider` accepts `value={[min,max]}` already.
- All new URL params get `fallback(..., default)` so old links keep working.
