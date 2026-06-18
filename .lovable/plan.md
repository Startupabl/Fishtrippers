## Plan: Reorder TripCard header lines and move meeting details up

### What we will change
In `src/components/operator-listing/TripsBlock.tsx`, restructure the collapsed `TripCard` header so the lines below the title read in this order, and move the meeting location out of the expanded body.

#### New header layout (below the title/price row)
| Line | Left side | Right side |
|------|-----------|------------|
| 2 | **Experience:** [environment/technique labels] | Shared trip: Up to [maxParty] guests |
| 3 | **Fishing for:** [species list] | — |
| 4 | **Begins at:** [formatted start time] | — |
| 5 | **Meet at:** [departure address] | — |

- The "Experience:" line uses the existing `fishingEnvironmentLabel` and technique mapping, conditionally hidden when both environments and techniques are empty.
- The "Fishing for:" line keeps the existing species preview.
- The "Begins at:" line uses the existing `formatStartTime` helper and is hidden when `start_time` is missing.
- The "Meet at:" line uses `trip.departure_address` and is hidden when the address is missing.
- The capacity text ("Shared trip: Up to X guests") moves from the species line to right-align on the "Experience:" line.

#### Expanded body changes
- Remove the `MapPin` + departure address block from the expanded body.
- The expanded body will then read: description → guests stepper → payment summary → currency disclaimer → CTA buttons.

### What we will NOT change
- No data model or API changes.
- No pricing, currency, or booking logic changes.
- No new dependencies.
- No changes to the species, environment, or technique helpers.