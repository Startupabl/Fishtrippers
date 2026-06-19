# Simulate Payment Success (Stripe stand-in)

Goal: until Stripe is wired up at the end of the project, let you click a button that **pretends Stripe just confirmed the payment** and triggers every downstream side-effect (booking → confirmed, captain + angler alerts, transactional emails, success page, dashboards updating). No real charge, no Stripe call.

## Where it appears

1. **`/booking/checkout` (trip deposit flow)** — the main flow. Add a secondary button under the "Continue to Payment" button:
   - Label: **"Simulate payment success (dev)"**
   - Style: dashed outline, amber/warning accent so it's obviously not the real CTA.
   - Visible whenever a `SIMULATE_PAYMENTS` flag is on (see below).
2. **`/checkout` (legacy mentor/journey checkout)** — already uses an in-memory store with a fake `sleep(1200)`. Leave as-is; it's already a simulation. Just rename its button copy to "Simulate payment success" so the intent is obvious.

## Feature flag

Add a single client-readable env flag so we can turn the simulator off in one place once Stripe goes live:

```
VITE_SIMULATE_PAYMENTS=true   # in .env (dev/preview)
```

UI reads `import.meta.env.VITE_SIMULATE_PAYMENTS === "true"`. The server function (below) **also** checks the same flag server-side via `process.env.SIMULATE_PAYMENTS` and refuses to run if it's not set — so even if someone calls the endpoint on a live build, it's a no-op.

## New server function

`src/lib/trip-bookings.functions.ts` → add `simulateTripDepositPayment`:

- Auth-gated (`requireSupabaseAuth`) — only the learner who owns the booking can simulate it.
- Refuses if `process.env.SIMULATE_PAYMENTS !== "true"`.
- Input: `{ booking_id: string }`.
- Loads the booking via `supabaseAdmin`; verifies `learner_id === userId`; verifies `status === "pending_payment"`.
- Performs the **same writes the Stripe webhook does** for `checkout.session.completed` on the booking path:
  - `bookings.status = "confirmed"` (stamp a synthetic `stripe_checkout_session_id = "sim_<uuid>"` so we can tell simulated rows apart later).
  - `class_sessions` seat increment via existing `increment_class_session_seats` RPC if linked.
  - Insert `user_alerts` row for the captain (`kind: "booking_confirmed"`, rendered via `renderAlertTemplate`).
  - Send the two transactional emails (`booking_confirmed_aide`, `booking_confirmed_learner`) via the existing `sendEmail` helper, exactly like the webhook.
- Returns `{ booking_id }`.

To avoid duplicating ~120 lines of webhook code, extract the inner body of the webhook's "Booking-flow checkout" branch into a shared helper `confirmBookingAfterPayment(bookingId, { sessionId })` in `src/lib/booking-confirm.server.ts`, and call it from both the webhook **and** the new simulate function. Pure refactor — no behavior change for real Stripe.

## UI wiring on `/booking/checkout`

After the existing `handleContinue`, add `handleSimulate`:

1. Run the same validation (name, phone, etc.) and create the booking row by calling `createTripDepositCheckout` — but we need its `booking_id` without redirecting to Stripe. Two options; pick **B**:
   - **A.** Have `createTripDepositCheckout` also return `booking_id` (it already does) and just ignore the `url`. Downside: still spends a Stripe API call creating product/price/session.
   - **B.** Add a sibling `createTripBookingDraft` server fn that does steps 1–4 of `createTripDepositCheckout` (validation, capacity recheck, fee calc, `bookings` insert with `status: "pending_payment"`) but skips all Stripe calls. The real `createTripDepositCheckout` is refactored to call this helper too, so logic stays in one place.
2. Call `simulateTripDepositPayment({ booking_id })`.
3. Navigate to `/checkout/success?booking_id=<id>` — the existing success page already polls for the `confirmed` status and shows confetti + booking details, so no changes needed there.

## Visual treatment

```
[ Continue to Payment ]            ← primary, unchanged
[ ⚡ Simulate payment success ]    ← dashed amber, only shown when flag is on
   Dev only — skips Stripe and marks this booking as paid.
```

## Out of scope

- Custom-offer chat flow simulation (separate path, can add later if needed).
- Gift-card / course-order checkout (`/checkout` legacy page is already simulated).
- Refund / cancel simulation — only payment success for now.

---

## Technical summary

- New file: `src/lib/booking-confirm.server.ts` — `confirmBookingAfterPayment(bookingId, { sessionId })` extracted verbatim from `src/routes/api/public/stripe/webhook.ts` lines ~220–340.
- Edit: `src/routes/api/public/stripe/webhook.ts` — replace inline branch with `await confirmBookingAfterPayment(meta.booking_id, { sessionId: session.id })`.
- Edit: `src/lib/trip-bookings.functions.ts` — extract draft-creation helper, add `simulateTripDepositPayment` server fn (auth + flag-gated).
- Edit: `src/routes/_authenticated/booking.checkout.tsx` — add secondary "Simulate payment success" button visible when `import.meta.env.VITE_SIMULATE_PAYMENTS === "true"`.
- Edit: `.env` — add `VITE_SIMULATE_PAYMENTS=true` and `SIMULATE_PAYMENTS=true`.
- No DB migration needed.
