## Goal
Temporarily hide every Stripe / payment UI surface so the project can be remixed cleanly. **No Stripe code, server functions, webhook, or DB schema is removed** — re-enabling later is just reverting these UI changes.

A single feature flag drives every hide so reverting is a one-line change.

## Approach
Add `src/config/payments.ts` exporting `export const PAYMENTS_ENABLED = false;` and gate the UI on it.

## Changes

**1. Feature flag**
- New file `src/config/payments.ts` — exports `PAYMENTS_ENABLED = false`.

**2. Admin nav (hide Stripe entry)**
- `src/routes/_admin/admin.settings.tsx` — remove the "Master Stripe Integration" card from `CARDS` (leaves 3 cards: Categories/Page Settings/Platform Communications + Inbox). Route files for `admin.settings.stripe.tsx` and `admin.settings.payments.tsx` stay on disk, just unlinked.

**3. Buyer-side payment buttons → disabled stub**
For each, when `!PAYMENTS_ENABLED`, render a disabled button with text "Payments temporarily disabled" (keeps layout intact):
- `src/components/checkout/PaymentPanel.tsx` — disable the "Pay & Reserve" button.
- `src/components/gift/GiftCheckoutDialog.tsx` — disable the "Pay & Send Gift" button.
- `src/components/layout/CartDrawer.tsx` — disable the "Checkout" button.
- `src/components/chat/CustomOfferCard.tsx` — disable the offer "Pay" button.
- `src/routes/checkout.tsx` — short-circuit `handlePay` to a toast "Payments disabled" instead of running the mock booking flow (optional safety; the underlying flow is already local-state).

**4. Mentor / payout-onboarding CTAs (hide Stripe Connect surfaces)**
Wrap the existing Stripe Connect blocks in `PAYMENTS_ENABLED` checks so they render nothing:
- `src/routes/_authenticated/settings.billing.tsx` — hide Connect onboarding card; show a short notice "Payouts are temporarily disabled."
- `src/routes/_authenticated/dashboard.aide.courses.tsx` — hide "Connect Stripe Account" banner and the checklist row that flags missing Stripe.
- `src/routes/_authenticated/dashboard.tsx` — hide the "Stripe not connected" alert.
- `src/routes/mentor.create-path.tsx` — remove the Stripe payout-readiness gating (treat as ready) and trim the "Don't have a Stripe account?" copy.

**5. Gift route**
- `src/routes/gift.tsx` — disable "Gift This" tier buttons with the same stub label.

## Out of scope (intentionally untouched)
- `src/lib/stripe.server.ts`, `src/lib/platform-stripe.functions.ts`, `src/lib/payouts.functions.ts`, `src/lib/checkout.functions.ts`
- `src/routes/api/public/stripe/webhook.ts`
- `src/routes/_admin/admin.settings.stripe.tsx`, `admin.settings.payments.tsx`
- Database tables, RLS, Stripe-related columns
- The `@stripe/*` npm packages

## Re-enabling after remix
Flip `PAYMENTS_ENABLED` to `true` and re-add the Stripe card to `CARDS` in `admin.settings.tsx`. Everything else lights back up automatically.
