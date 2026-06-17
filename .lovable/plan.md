## Goal
Replace the three separate pills on `OperatorCard` with one rounded capsule split into segments by thin vertical dividers, matching the attached design. The boat icon pulls from the operator's vessel `boat_type.icon_url` (admin-managed boat type database) instead of a hardcoded Lucide icon.

## Changes

### 1. `src/lib/operators-search.functions.ts`
- Extend the operators select to pull `vessels ( length_ft, max_passenger_capacity, boat_type_id, boat_types ( icon_url, subcategory_name ) )`.
- Add to `OperatorCardDTO`:
  - `boat_type_icon_url: string | null`
  - `boat_type_name: string | null`
  - `rating: number | null` (null for now — no aggregate source yet)
  - `review_count: number | null` (null for now)
- Map the joined boat_type icon onto the DTO. Rating/review_count remain null until a reviews-aggregate is wired (out of scope here).

### 2. `src/components/listings/OperatorCard.tsx`
Replace the current row of three separate pills with one capsule:

```text
┌───────────────────────────────────────────────┐
│ [boat-icon] 28 ft │ 👥 4 │ ★ 5.0 (70)         │
└───────────────────────────────────────────────┘
```

- Single `div` with `rounded-full bg-card/95 shadow-sm backdrop-blur` containing flex children.
- Each segment is a flex item with `px-3 py-1.5`, separated by `divide-x divide-border` (or explicit `border-l` on segments 2+).
- Segment 1: boat icon. If `boat_type_icon_url` exists render an `<img>` (size-4, object-contain) with alt = boat_type_name. Fallback to `Sailboat` lucide icon. Then `{length_ft} ft`.
- Segment 2: `Users` icon + capacity number.
- Segment 3: filled star (amber) + rating + `(count)` in muted. Only render when `rating != null`; otherwise omit this segment entirely so the capsule stays clean.
- Keep "Verified" badge as its own separate small pill above-right OR fold into the title row only (already shown next to the name) — remove the duplicate verified pill on the image to match the design's single capsule.

### 3. No DB migration
`boat_types` table and `vessels.boat_type_id` FK already exist with `icon_url`. Public anon SELECT policy on `boat_types` is already in place.

## Out of scope
- Wiring real review aggregates (rating/count) — the segment will simply not render until that data exists.
- Onboarding/admin changes to boat type selection.

## Files touched
- `src/lib/operators-search.functions.ts` (extend query + DTO)
- `src/components/listings/OperatorCard.tsx` (new capsule layout)
