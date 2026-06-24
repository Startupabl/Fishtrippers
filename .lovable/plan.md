Fix missing city/region on operator cards for guides (and any operator where the address picker stored a place but failed to capture city/state/country).

## What's wrong

`The Shoreline Master` has `default_departure_address` and `default_departure_place_id` set, but `default_departure_city`, `_state`, `_country` are all NULL. That's why the card shows no "City, ST" line. The card code (`OperatorCard.tsx`) already supports the city label for guides identically to charters — the data simply isn't there.

Root cause: `DeparturePointPicker.handlePick` calls `resolvePlace` (Google) and stores `city/state/country`. If the Google call fails or throws, the catch block stores `address + placeId` with `city/state/country = null`. There's also no UI fallback for older records.

## Changes

1. **Harden `resolvePlace` fallback in `DeparturePointPicker`**
   - When `resolvePlace` succeeds but `city`/`state` are missing, derive a best-effort `city, state` by parsing the formatted address tail (last 3 segments: `"…, City, ST ZIP, Country"`). Persist that as a fallback instead of leaving null.
   - When `resolvePlace` throws, surface a toast instead of silently storing nulls.

2. **UI fallback in `OperatorCard`** — last line of defense
   - In `operators-search.functions.ts`, when `default_departure_city`/`state` are null but `default_departure_address` exists, parse the same tail and use that for the `city` / `state` fields returned in `OperatorCardDTO`. No schema changes.

3. **Backfill existing rows** via an admin server function
   - Add `backfillOperatorPlaceComponents` in `src/lib/operators.functions.ts`, gated to admins (via `has_role`).
   - For every operator where `default_departure_place_id IS NOT NULL AND default_departure_city IS NULL`, call `resolvePlace` and update the row's city/state/country.
   - Trigger it once for the user; only 1 row affected today (`The Shoreline Master`).

No DB migration is needed — columns already exist; RLS/GRANTs unchanged.

## Files touched

- `src/components/operator-onboarding/trips/DeparturePointPicker.tsx` — fallback parse + error toast
- `src/lib/operators-search.functions.ts` — DTO fallback parse for legacy rows
- `src/lib/operators.functions.ts` — new admin backfill server fn
- Run the backfill once after deploy

## Out of scope

- No change to the card layout — city/region already render the same for guides and charters via `OperatorCard.tsx`.
- No change to `saveDefaultDeparture` shape.