## Goal

On the public/preview listing's Trips section, replace the hard-coded
"Shared trip: Up to {N} guests" header label with one that reflects the
trip's `charter_type` chosen during trip creation.

- `charter_type = "shared_tour"` → **"Shared trip: Up to {N} guests"**
- `charter_type = "private_charter"` (default) → **"Private trip: Up to {N} guests"**

The DB column already exists (`trip_packages.charter_type`) and is
already returned by both `getPublicOperatorListing` and
`getMyOperatorListing` (they `select("*")`), so no server or schema
changes are needed.

## Files to edit

**`src/components/operator-listing/TripsBlock.tsx`** — only file touched.

1. Extend the local `Trip` interface to include the two new fields the
   server already returns:
   ```ts
   charter_type?: "private_charter" | "shared_tour" | null;
   seats_available?: number | null;
   ```

2. In `TripCard`, derive:
   ```ts
   const isShared = trip.charter_type === "shared_tour";
   const capacity = isShared
     ? (trip.seats_available ?? maxParty)
     : maxParty;
   const charterLabel = isShared ? "Shared trip" : "Private trip";
   ```

3. Update the header line (currently line 221):
   ```tsx
   {capacity > 0 && (
     <p className="whitespace-nowrap text-sm text-muted-foreground">
       {charterLabel}: Up to {capacity} guests
     </p>
   )}
   ```

4. Update the price-details popover line (currently line 187) to use
   the same `charterLabel` and `capacity` so it stays consistent:
   ```tsx
   {capacity > 0 && (
     <div className="mt-0.5 text-xs text-muted-foreground">
       {charterLabel}, up to {capacity} guests
     </div>
   )}
   ```

## Out of scope

- No changes to booking/checkout logic, per-seat pricing math, or
  shared-tour seat countdowns — this PR is just the header wording.
- No DB migration; `charter_type` + `seats_available` already exist.
- No changes to server functions, since `select("*")` already includes
  the new columns.
