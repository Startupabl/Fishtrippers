## What to change

### 1. Keep editing unlocked at every stage
- The captain/guide listing should remain fully editable in `draft`, `pending`, `approved`, and `rejected` states. Admins read whatever is current — that's the point.
- Audit and remove any UI gating in `dashboard/my-listing`, `operator/preview`, and the onboarding flow (`mentor/create-path`) that hides "Edit listing" / "Add trip" / "Manage gallery" once `moderation_status !== 'draft'`. Buttons stay live; only the moderation badge changes.
- On the server side (`src/lib/operators.functions.ts` `upsertOperatorDraft`, `src/lib/trips.functions.ts`), do not block writes when `moderation_status` is `pending` or `approved`. Existing code already has an inert guard comment — make sure no caller refuses to mutate.
- A live edit on an `approved` listing flips moderation back to `pending` and notifies admin (existing pattern); a `pending` edit just updates in place. No new admin tooling — they review the current state.

### 2. Stripe-connect popup after "Submit for approval"
After `submitOperatorForReview` succeeds in `src/components/operator-onboarding/steps/ReviewSubmitStep.tsx`:
- Instead of redirecting straight to `/operator/preview`, open a new `<ConnectPayoutsDialog />`.
- Dialog copy (matches the prior design):
  - Title: "One more thing — connect payouts"
  - Body: "Your listing is in review. To accept bookings the moment we approve it, connect your Stripe account now. Without payouts connected we can't approve your listing."
  - Primary CTA: "Connect Stripe" → calls existing `startStripeOnboarding` server fn from `src/lib/payouts.functions.ts` and redirects to the returned URL.
  - Secondary CTA: "I'll do this later" → closes dialog and navigates to `/operator/preview`.
- Same dialog is also surfaced from `My Listing` when `moderation_status === 'pending'` AND `is_payout_ready === false`, as a dismissible inline banner with the same two CTAs (no auto-popup on revisit).
- New file: `src/components/operator-onboarding/ConnectPayoutsDialog.tsx`. No backend changes — reuses `startStripeOnboarding`, `getMyStripeIds`.

### 3. Revert `My Listing` to the original column/actions layout
Restore the table-driven UX from the legacy `dashboard.aide.courses.tsx` page, but pointed at the new `operators` + `trip_packages` schema. Replace the current single-card layout in `src/routes/_authenticated/dashboard.my-listing.tsx` with:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  My Captain Listing                              [+ Add trip]  [Preview] │
├──────────────────────────────────────────────────────────────────────────┤
│  Listing │ Status      │ Bookings │ Earnings │ Strength │ Actions        │
│  Blue …  │ Pending ●   │   0      │ $0       │ 70%      │ ✎ 📅 🔗 ⋯     │
└──────────────────────────────────────────────────────────────────────────┘
                          Trips (sub-table, same row format)
```

- Top row: one row per operator listing (currently always one) with columns: Listing (thumb + name + #LST-…), Status, Bookings (count), Earnings (sum), Strength (% — reuse `computeStrength` adapted for operators: showcase + availability + stripe), Actions.
- Actions menu items: Edit listing → `/mentor/create-path`, Preview → `/operator/preview`, View public page (when slug+category set), Manage availability (drawer), Schedule live date (existing `ScheduleLiveDateDialog`), Archive / Delete with confirm.
- Below: a Trips table with the existing Title / Duration / Price / Departure columns plus an Actions column (Edit, Delete) — keep `TripFormDialog` integration.
- Status pill matches old logic: Draft, Pending Review, Live, Declined, Action Needed.
- Stripe-not-connected inline banner from item (2) renders above the table.

No schema changes. No new server functions beyond what already exists (`listMyTrips`, `getMyOperator`, `getMyStripeIds`, `startStripeOnboarding`, `archiveListing` patterns).

## Out of scope
- No admin-side changes (admin already reads operators).
- No new tables, no RLS edits.
- No change to the public listing page.
