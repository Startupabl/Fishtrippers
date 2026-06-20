# Update Cancellation Policies + Add Manage Policies Page

## 1. Rewrite policy copy (single source of truth)

Update `CANCELLATION_POLICY_DETAILS` in `src/lib/operators.shared.ts` so every screen (Step 6, listing preview, public listing, new Manage Policies page) reads the new text:

- **Flexible** — "Best for attracting new customers"
  - Up to 24 hours before departure: free cancellation (deposit refunded).
  - Inside 24 hours: card on file is charged a 50% cancellation fee of the total trip price.

- **Moderate** — "Balanced protection for captain and guest"
  - 7+ days before departure: free cancellation.
  - Between 7 days and 24 hours before: card on file is charged a 50% cancellation fee of the total trip price.
  - Inside 24 hours: card on file is charged a 90% cancellation fee (the full remaining balance).

- **Strict** — "Best for high-demand seasons"
  - 14+ days before departure: free cancellation.
  - Inside 14 days: card on file is charged a 90% cancellation fee (the full remaining balance).

Also tighten `WEATHER_POLICY_DISCLAIMER` wording (kept as the standard, non-selectable weather clause shown on Step 6, Manage Policies, and the listing preview):

> "Weather policy (standard for all trips): If the Captain cancels due to unsafe weather or sea conditions, the guest always receives a 100% refund."

Update the legacy short strings in `src/lib/cancellation-policies.ts` to match the new summaries so any consumer (checkout, emails) shows consistent copy.

## 2. Step 6 (BookingRulesStep) + listing preview/view

No structural change — they already render `CANCELLATION_POLICY_DETAILS` and `WEATHER_POLICY_DISCLAIMER`, so they pick up the new copy automatically. Confirm Step 6's weather paragraph is shown as a fixed, standard disclaimer (not selectable) and that `PoliciesBlock` on `operator.preview.tsx` / public listing renders the same three-card view + weather disclaimer.

## 3. New "Manage Policies" page

Create `src/routes/_authenticated/dashboard.manage-policies.tsx`:

- Loads operator via `getMyOperator` (TanStack Query, loader + `useSuspenseQuery`).
- Renders the same 3 cards as Step 6 (`CANCELLATION_POLICY_DETAILS`) with the captain's current selection highlighted.
- Lets the captain click a card to select a new policy; a "Save policy" button calls a new server function `updateOperatorCancellationPolicy` (added to `src/lib/operators.functions.ts`, `requireSupabaseAuth`, validates input is one of `CANCELLATION_POLICIES`, updates `operators.cancellation_policy` for the owner's listing).
- Standard weather policy disclaimer shown below the cards (read-only).
- On success: toast + invalidate `["my-operator"]` query.

## 4. Wire Manage Policies into manage-listing UI

In `src/routes/_authenticated/dashboard.my-listing.tsx`:

- Add a new icon button in the listing row's action group titled "Manage Policies" (Shield/FileText icon) linking to `/dashboard/manage-policies`.
- Add a "Manage Policies" item to the row's `DropdownMenu` (with separator).

## Technical notes

- No DB migration required — `operators.cancellation_policy` already exists and `BookingRulesStep` already writes to it. The new page just exposes editing it outside the wizard.
- The new server fn must call `requireSupabaseAuth` and update only the row where `owner_id = userId`, relying on existing RLS.
- Route file name uses flat dot convention: `dashboard.manage-policies.tsx` (child of `dashboard` layout, same as `dashboard.my-listing.tsx`).
- Keep `cancellation-policies.ts` as-is structurally — only update the `text` fields so checkout/emails stay aligned.

## Verification

- Step 6 cards show new bullets; weather disclaimer is the standard line, not user-editable.
- Listing preview (`/operator/preview`) and public listing show the new policy text via `PoliciesBlock`.
- `/dashboard/manage-policies` loads, shows 3 cards with current policy highlighted, lets captain switch + save, and reflects the change on refresh.
- Manage listing row shows a Manage Policies icon button and dropdown item linking to the new page.
