I recommend changing the species cards so each fish sits inside the same light-grey circular badge, centered in a fixed-size slot.

Plan:
1. Update `SpeciesGrid.tsx` only.
2. Replace the current plain fish image box with a consistent circular badge, e.g. a light grey/tinted circle inside each card.
3. Keep every card the same height and every badge the same size so the row alignment is visually anchored even if the PNG artwork has uneven transparent padding.
4. Slightly reduce the fish image inside the circle so different species do not touch the badge edges.
5. Keep labels below the badge in a fixed-height text row so names do not move the fish row.

Why this should work:
- The circle gives the eye a common baseline and center point.
- The fish images can still vary naturally, but the cards will no longer look like they are zigzagging.
- This is a frontend-only styling change; no image assets or data changes needed.