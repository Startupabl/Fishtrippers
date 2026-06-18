Update the TripCard header in `src/components/operator-listing/TripsBlock.tsx` to a clean, two-row layout.

```text
┌─────────────────────────────────────────────────────────────────┐
│ Half Day Trip (4 hrs)                 US $440.00           ▼    │
│ Fishing for: Snapper, Grouper         Shared trip: Up to 4 guests│
└─────────────────────────────────────────────────────────────────┘
```

Changes:
1. Restructure the header toggle into two full-width rows, both inside the existing `<button>`.
2. Top row (flex, justify-between):
   - Left: `trip.title` + `formatDuration(trip.duration_minutes)` as a single inline string, e.g. `"Half Day Trip (4 hrs)"`, in `text-xl font-bold` (20px equivalent).
   - Right: base price `formatCurrency(baseDisplay, display)` in `text-xl font-bold text-emerald-600`.
   - Chevron remains at the far right, vertically centered, as the accordion affordance.
3. Bottom row (flex, justify-between, mt-1):
   - Left: target species list in `text-sm text-muted-foreground`, prefixed with "Fishing for:". If the species list is empty, omit this left element.
   - Right: static capacity text in `text-sm text-muted-foreground`, exactly `"Shared trip: Up to ${maxParty} guests"`.
4. Remove the existing `metaParts` header line (max guests, departure time, location, duration) from the collapsed header; that detail stays inside the expanded body.
5. Keep all existing expanded body content (description, chips, guest stepper, payment summary, buttons, helper text) unchanged.

No new dependencies. No data or pricing logic changes.