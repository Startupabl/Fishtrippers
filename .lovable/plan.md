Fix the trip card accordion so every trip is collapsed by default on page load. Currently the first trip (`i === 0`) is forced open via `defaultOpen`. Change `TripsBlock` to pass `defaultOpen={false}` (or remove the prop) so all trips start closed and users click the chevron to expand details.

**Technical detail:**
- In `src/components/operator-listing/TripsBlock.tsx`, line 533, change `defaultOpen={i === 0}` to `defaultOpen={false}`.