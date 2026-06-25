## Investigate why the contact card still shows the listing title

The current code already does `captainName = owner?.full_name || op?.display_name || "Captain"`, and the database confirms your profile has `display_name = "Mac C."` and an avatar set. So in theory the card should already show "Mac C." with your avatar.

Since it isn't, something between server and browser is off. Plan:

1. Open the live listing in a headless browser and screenshot the left-column card to capture exactly what's rendered.
2. Dump the rendered name + the server response for `getPublicOperatorListing` to compare. Two likely culprits:
   - The server function's `ownerProfile` is coming back `null` (e.g. RLS on `profiles` blocks the anon publishable-key read), so `captainName` falls back to `op.display_name` ("Salty Dog Offshore Charters").
   - A stale SSR cache for that URL is serving HTML built before the change.
3. If `ownerProfile` is null: fix the read. The public listing fetch in `src/lib/operator-public.functions.ts` uses the anon/publishable client; `profiles` RLS may not allow anon `SELECT`. Two safe options, picked based on what we find:
   - a. Add a narrow `TO anon` SELECT policy on `profiles` exposing only `id, display_name, first_name, last_name, avatar_url` (or move the projection to a SECURITY DEFINER view limited to those columns) — least invasive.
   - b. Switch just that one read inside the handler to load via a lightweight server-only path that already has access to the owner profile.
4. If it's a caching issue, force a fresh fetch (no code change needed) and confirm.
5. Re-verify on the page that the card shows "Mac C." + avatar, with "Captain" eyebrow and "Contact captain" button.

No UI changes are needed beyond what's already shipped — this is a data-availability fix.
