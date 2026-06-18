Refactor the TripCard header and expanded body in `src/components/operator-listing/TripsBlock.tsx` to move category/style info into the header and simplify the body.

Plan:

1. Add an "Experience" line to the header
   - Add a third full-width row below the existing `Fishing for:` / capacity row.
   - Format it as: `Experience: ${environmentLabel}, ${technique}` (using the existing `fishingEnvironmentLabel` helper and raw technique strings).
   - Use the same `text-sm text-muted-foreground` styling as the `Fishing for:` line.
   - Hide the line when no environments or techniques are present.

2. Remove the moved content from the expanded body
   - Remove the environment and technique chips from the body.
   - Remove the `Targeting:` species chip section from the body (species remain visible in the header preview only).

3. Reorder the expanded body
   - Move the trip `description` to the very top of the expanded body.
   - Place the departure address / meeting location icon row directly after the description.
   - Keep the guest stepper, payment summary, currency disclaimer, and CTA buttons unchanged after that.

4. Scope
   - Frontend-only refactor; no data shape, pricing math, or currency changes.
   - No new dependencies.

File changed: `src/components/operator-listing/TripsBlock.tsx`.