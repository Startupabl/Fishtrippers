## Admin Users — Trips column + Angler role label

### 1. `src/lib/admin.functions.ts` — `listAdminUsers`
- Replace the `journeys` + `operators` fetch used for `listings_count` with:
  - Fetch `operators` (`id, owner_id, business_type`) for the visible profile IDs (drop the journeys query — journeys are no longer surfaced).
  - Fetch `trip_packages` (`operator_id`) for the collected operator IDs.
- Build:
  - `trips_count` per user = sum of trip_packages whose `operator_id` belongs to that user's operators.
  - `operator_business_types: string[]` per user (e.g. `["charter"]`, `["guide"]`, or both) — used downstream for the role label.
- Return shape changes:
  - Remove `listings_count` and `payout_status` (payout column was already removed from the UI).
  - Add `trips_count: number` and `operator_business_types: string[]`.

### 2. `src/routes/_admin/admin.users.index.tsx`
- Rename the "Listings" column header to "Trips".
- Render `u.trips_count` in that cell.
- Update the local `AdminUser` type: drop `listings_count`, add `trips_count` and `operator_business_types`.

### 3. `src/routes/_admin/admin.users.$userId.tsx`
- Replace the `Roles` field (currently shows raw role strings like "learner, aide") with a computed `Role` field placed in the same slot directly below `Time Zone` (matches the user's "1st section below the time zone" instruction).
- Logic:
  - If the user has any owned operator → label = `Angler + Captain` when business_type is charter, `Angler + Guide` when guide, `Angler + Captain/Guide` when both (or unknown).
  - Otherwise → `Angler`.
  - Admins still get the existing "(Admin)" treatment elsewhere; this field only describes platform persona.
- The server response for the detail view already exposes operators; if it doesn't carry `business_type`, extend the existing detail server fn to include it (no schema change).

### Technical notes
- No DB migration. `trip_packages.operator_id` and `operators.business_type` already exist.
- Sorting/search in the users table is unaffected (sort keys are `user_number_id` and `full_name`).
- The "Roles" dt/dd block in the detail page is replaced in place — no new sections, no layout shifts.
