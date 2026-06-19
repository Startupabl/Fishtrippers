Frontend-first cleanup plus one targeted server tweak so buyers can always check out. The buyer-deposit Stripe checkout (platform account) stays — we just stop blocking on the captain having a Stripe Connect account and remove all "connect Stripe" prompts from captain/guide and admin surfaces. Server functions and the `profiles.stripe_connect_id` column stay in place so historical data isn't lost.

## 1. Post-listing-creation popup → "Manage your listing"
File: `src/components/operator-onboarding/ConnectPayoutsDialog.tsx`
- Rename to `ListingSubmittedDialog` (update both call sites).
- Drop the `startStripeConnectOnboarding` import + `handleConnect`.
- New copy:
  - Title: "Listing submitted for review"
  - Body: "Thanks! Our team will review your listing within 24 hours. In the meantime, head to **My Listings** to manage your trips, availability, and photos."
  - Primary button: "Go to My Listings" → `navigate({ to: "/dashboard/my-listing" })`
  - Secondary: "Close"
- Call sites (`operator.preview.tsx`, `dashboard.my-listing.tsx`): no logic change beyond new copy/intent.

## 2. `dashboard.my-listing.tsx` — remove Stripe Connect everywhere
- Remove `getMyStripeIds` import, `stripeQ`, `isPayoutReady`, `showStripeBanner`, and the whole "Connect Stripe to enable payouts" banner (~lines 283–311).
- Remove `stripe` from the readiness score (use `hasCover && hasTrips`).
- Remove the "Connect Stripe / Manage payouts" `DropdownMenuItem` (~lines 478–482).
- Keep the (renamed) dialog mount for the post-submit flow.

## 3. Admin — remove Stripe/Payouts column
File: `src/routes/_admin/admin.users.index.tsx`
- Remove the `Payouts` `<th>`/`<td>`, `PayoutBadge`, `PayoutStatus`, `PAYOUT_RANK`, `stripe_connect_id`/`payout_status` fields on `AdminUser`, and `payout_status` from `SortKey`.
- Update `colSpan={8}` → `colSpan={7}`.

File: `src/routes/_admin/admin.users.$userId.tsx`
- Remove the Stripe-account block (~lines 453–500: the `stripe_connect_id` display and "No account linked" line).

Server fns (`listAdminUsers`, etc.) can still return `stripe_connect_id`; the UI just stops reading it.

## 4. Account settings → `settings.billing.tsx`
- Strip all captain Stripe-Connect UI:
  - Three "Stripe return" banners (success / incomplete / refresh) at the top.
  - `?stripe=return|refresh` search param + `useEffect` calling `finalizeStripeConnectReturn`.
  - "Payout setup — temporarily disabled" card.
  - "Earnings history" card gated on `isPayoutReady`.
  - Imports/state: `getMyStripeIds`, `startStripeConnectOnboarding`, `finalizeStripeConnectReturn`, `connecting`, `stripeIds`, `isPayoutReady`, `hasStripeAccount`, `handleConnect`.
- Keep: "Secure Payments — Powered by Stripe" notice (buyer payment processor, unrelated to Connect), billing-address card, transaction-history card.
- Everyone (buyer or captain/guide) sees the same billing page, no Connect prompts.

## 5. Booking → Payment: never block the buyer on captain Stripe (new)
File: `src/lib/trip-bookings.functions.ts`
- Remove the "Captain Connect preflight" block (~lines 235–245) that throws "This captain is still finishing payout setup…". Buyers must always be able to continue to deposit checkout.
- In the `gwCreateCheckoutSession(...)` call (~line 296–314), drop `transfer_destination: captainProfile.stripe_connect_id` and `application_fee_amount: fees.feeMinor` so the deposit charges the platform account directly with no transfer to a captain Connect account. (Today's deposit goes to FishTrippers; dockside balance is handled by the captain offline per the new flow.)
- Drop the now-unused `captainProfile` lookup.
- Booking row still records `service_fee_amount` / `aide_earnings` for accounting; only the Stripe-side transfer wiring is removed.

This is the minimum server change needed to honor the request — without it, the existing preflight would still 500 the checkout for any captain who hasn't connected Stripe.

## Out of scope (intentionally not touched)
- `src/lib/payouts.functions.ts`, `src/lib/stripe.server.ts`, Stripe Connect webhook handlers, and the `profiles.stripe_connect_id` column. Removable in a follow-up once you confirm nothing else depends on them.

## Verification
- `/dashboard/my-listing`: no Stripe banner or "Connect Stripe" buttons; readiness score works without payouts.
- After submitting on `/operator/preview`: dialog reads "Listing submitted for review" with a "Go to My Listings" CTA.
- `/admin/users`: no Payouts column / sort; empty-state cells use `colSpan={7}`.
- `/admin/users/:id`: no Stripe account section.
- `/settings/billing`: no Stripe Connect banners, payout-setup card, or earnings-history card.
- Booking → "Continue to Payment" on a trip whose captain has never connected Stripe: redirects to Stripe Checkout successfully (no "captain still finishing payout setup" error).
- TypeScript build passes (no dangling imports / unused refs).
