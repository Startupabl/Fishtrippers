## Problem
When admin approves a new listing, the `operators` row flips to `published`, but the trip(s) the user added during onboarding stay as `draft` in `trip_packages`. Result: live listing page shows no trips, and the user's "My Listing" page shows the trip as unpublished.

## Fix
Update `approveListing` in `src/lib/admin-listings.functions.ts` so that whenever admin sets moderation to `approved`, we also flip any `draft` trips belonging to that operator to `active` in the same transaction.

### Change (in `approveListing` handler, inside the `if (data.moderation === "approved")` block, after the operators update succeeds)

```ts
await (supabaseAdmin.from("trip_packages") as any)
  .update({ status: "active" })
  .eq("operator_id", data.journeyId)
  .eq("status", "draft");
```

### Scope rules
- Only runs on `approved` (not on `declined` or `pending`).
- Only touches `draft` trips — never demotes/changes trips the captain has intentionally paused or archived later.
- No schema migration needed; no UI changes needed. The "My Listing" trip toggle already reads `status === 'active'`, so it will reflect the new state on next load.

## Out of scope
- Re-approval flows for listings that have been edited after first approval (existing behavior unchanged).
- Trips the captain creates *after* approval — those already follow the normal draft→active toggle in the UI.
