## Issue
Trip catalog step never shows a green checkmark, even after adding trips. The sidebar status function has no case for `trip_catalog`, so it always returns "upcoming".

## Fix
1. In `src/routes/mentor.create-path.tsx`, fetch the user's trips with the existing `listMyTrips` query (same `["my-trips"]` key already used in TripCatalogStep, so they share cache).
2. Add a `trip_catalog` branch in the status function: `complete` when trip count > 0, otherwise `upcoming`.
3. After saving a trip in the dialog, the cache invalidation already in place will update the sidebar automatically.

No backend or schema changes.