
## Goal

Replace the legacy `/checkout` flow for trip bookings with a new **`/booking/review`** page that anglers see right after picking a date in `CheckDatesDialog`. It collects angler info, shows policies + sticky pricing summary, then redirects to Stripe for the 10% deposit.

## Route wiring

- **`CheckDatesDialog.tsx`**: change `navigate({ to: "/checkout", ... })` → `navigate({ to: "/booking/review", search: { trip_id, trip_date, guests } })`.
- Old `/checkout` route stays untouched (used by Aide/Journey demo flow).
- New route file: `src/routes/_authenticated/booking.review.tsx` (auth-gated; redirects unauth users to `/auth` via existing layout).

## New server functions (`src/lib/trip-bookings.functions.ts`)

1. `getTripReviewDetails({ trip_id, trip_date, guests })` — auth required. Returns:
   ```ts
   {
     trip: { id, title, start_time, duration_minutes, price_minor, per_extra_minor, charter_type, currency },
     operator: { id, display_name, cancellation_policy, default_departure_address, default_departure_city },
     captain_name, captain_avatar_url,
     cover_image_url, // operators.cover_image_url
     pricing: { total_minor, deposit_minor, balance_minor }, // 10% / 90% split, charter-aware
     viewer: { first_name, last_name, phone, email }, // for prefill
   }
   ```
   Pricing math reuses the same charter-aware formula from `TripsBlock.tsx`:
   - private_charter: `price_minor + per_extra_minor * max(0, guests-1)`
   - shared_tour:    `price_minor * max(1, guests)`
   - deposit = `round(total * 0.10)`; balance = `total - deposit`.

2. `createTripDepositCheckout({ trip_id, trip_date, guests, primary_angler_name, phone, notes })` — auth required.
   - Validates trip + date capacity (re-checks `trip_seats_booked_by_date` RPC for shared tours).
   - Inserts a `bookings` row (`status='pending_payment'`, `course_id=trip_id`, `trip_date`, `guests`, computed totals, `aide_id=operator.id`, learner_id=auth.uid).
   - Persists `primary_angler_name`, `phone`, `notes` into `bookings.notes` JSON column (or new columns — see Technical Notes).
   - Calls existing `createBookingCheckoutSession`-style helper to make Stripe Checkout for **deposit amount only** and returns `{ url }`.

## Page UI (`/booking/review`)

Split layout `md:grid-cols-[1fr_400px]`.

### Left column — Angler Details & Policies
- **Primary Angler Name** input — prefilled from `viewer.first_name + last_name`.
- **Mobile Phone Number** input — required (validation enables Continue button).
- **Special Notes & Group Details** textarea — optional, 500-char limit.
- **Policies & Guidelines** card:
  - **Cancellation Policy**: map `operator.cancellation_policy` enum (`flexible` / `moderate` / `strict`) to canonical text via a `CANCELLATION_POLICY_COPY` constant.
  - **Weather Policy**: hard-coded copy from spec.

### Right column — Sticky Trip Summary
- Hero image: `cover_image_url`; fallback `Ship`/boat lucide icon in a placeholder div.
- Trip Title, Captain Name, Date (formatted) + start_time, Meeting Point (`default_departure_address` || city), Headcount (guests).
- **3-tier pricing stack**:
  1. `Total Trip Price` — `fmt(total_minor)`.
  2. `Pay Today (10% Deposit)` — large bold, accent badge.
  3. `Pay to Captain at Dock (90% Balance)` — muted, with sub-note: "Cash, Venmo, Zelle, or other methods accepted by your captain."

### Action
- `Continue to Payment` button — disabled when `phone.trim().length < 7`.
- Calls `createTripDepositCheckout`, then redirects to Stripe (reuse existing `navigateToStripe` top-frame escape from `booking-review.tsx`).
- Helper text under button: "By clicking 'Continue to Payment', you agree to our Terms of Service and authorize Fishtrippers to process today's deposit charge." Link "Terms of Service" → `/terms`.

## Technical Notes

- **Phone storage**: add nullable column `phone` + `primary_angler_name` + `notes` to `bookings` via migration. Notes already exists? — verify and reuse if present; otherwise add. (Will check during build and only add what's missing.)
- **Cover image**: use `operators.cover_image_url` (auto-synced by `sync_operator_cover` trigger from `operator_photos`).
- **Out of scope**: promo codes, gift cards, modifying the legacy `/checkout` route, modifying the existing `/_authenticated/booking-review` (Aide course) route. The new file uses path `/booking/review` (dot in filename), distinct from the legacy `/booking-review`.
- **Cancellation policy copy**: stored as a constant map in `src/lib/cancellation-policies.ts` — not pulled from DB freeform text (DB stores an enum). If the user wants editable per-operator policy text, that requires a schema change we can do in a follow-up.

## Open question

Three small assumptions worth confirming before I build — answer in chat or just say "go":

1. **Cancellation policy text**: pull canonical copy keyed by the existing `flexible/moderate/strict` enum (no DB change), OR add a freeform `cancellation_policy_text` column to operators?
2. **Dockside payment methods sub-note**: use a generic line ("Cash, Venmo, Zelle, or other methods accepted by your captain") OR add a `dockside_payment_methods text[]` column on operators for per-captain customization?
3. **Auth**: keep the page auth-gated (must be logged in to book)? Spec says "pre-filled if logged in" which implies guest checkout — but bookings need a `learner_id`. Default: auth-gated.
