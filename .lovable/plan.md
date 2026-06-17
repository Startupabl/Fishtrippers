## Changes to `/operator/preview`

### 1. `src/components/operator-listing/SectionNav.tsx`
- Remove the **Targeted species** item.
- Rename **Boat info** → **Boat Specs**.

### 2. `src/components/operator-listing/SpeciesGrid.tsx`
- Rename heading **Targeted species** → **Fishing for**.
- Drop the grid-of-cards layout. Render one rounded card (`rounded-2xl border bg-card p-6`) under the heading containing a single wrapped row of species chips/pills.

### 3. `src/components/operator-listing/BoatInfoBlock.tsx`
- Rename heading **Boat info** → **Boat Specs**.
- Reshape for the narrow side-rail (`~320px`): single column, vertical stack inside one compact card.
- Order, top to bottom:
  1. Boat type icon image (small, centered, e.g. `h-20 w-32 object-contain`)
  2. Boat type
  3. Manufacturer
  4. Year
  5. Length
  6. Engines (`N × HP HP`)
  7. Capacity (`N passengers`)
- Drop the Cruising-speed row (not in the requested list). Keep the "Recently restored" footnote.
- Each row stays as a `label / value` line with dashed underline, sized for the narrow column.

### 4. `src/components/operator-listing/AmenitiesGrid.tsx`
- Rename heading **What's included** → **Equipped with**. Section id stays `#included` (matches anchor link).

### 5. `src/routes/_authenticated/operator.preview.tsx`
- Remove `<BoatInfoBlock />` from the main column.
- Remove `<FeaturesCard />` from the right aside (duplicate of the on-page Equipped-with block).
- Right aside becomes: `CaptainCard`, then `BoatInfoBlock` (charter only) directly beneath it.
- Drop the now-unused `FeaturesCard` import.

## Out of scope
- Backend / data-model changes.
- Trip cards, gallery, policies, biting blocks.
