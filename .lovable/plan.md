## Goal

On `/dashboard/upcoming-sessions` (captain schedule), split everything into **Upcoming** vs **Completed** tabs, give the captain a "Mark as Complete" action on past confirmed trips and a "Cancel Offer" action on pending custom offers, propagate completion status to the angler's `/dashboard/learner/bookings` page, and let the angler open the review dialog from there.

## 1. Database migration

`booking_status_t` is currently `{pending_offer, declined, pending_payment, confirmed}` — no `completed` value — and `reviews` is hard-wired to `orders` (FK-less `order_id NOT NULL` + RLS EXISTS check on `orders`), so trip-booking completions and reviews can't be recorded.

- `ALTER TYPE booking_status_t ADD VALUE 'completed'`.
- Update `prevent_booking_field_tampering` and `sync_host_availability_from_booking` so `confirmed → completed` is permitted and `host_availability` for the date stays as `booked` (historical record).
- `reviews`:
  - Add nullable `booking_id uuid`.
  - Make `order_id` nullable.
  - Replace unique constraint with two partial unique indexes: `(order_id, learner_id) WHERE order_id IS NOT NULL` and `(booking_id, learner_id) WHERE booking_id IS NOT NULL`.
  - Add CHECK: exactly one of `order_id` / `booking_id` is set.
  - Add second insert RLS policy: learner may insert when their `booking_id` row has `status = 'completed'`.

## 2. Server functions

`src/lib/trip-bookings.functions.ts`:

- **`markTripBookingComplete({ booking_id })`** — `requireSupabaseAuth`. Verify `aide_id = userId` and current status is `confirmed`; update to `completed` via `supabaseAdmin`. Insert a learner `user_alerts` row ("Your trip is complete — leave a review").
- **`cancelPendingTripOffer({ booking_id })`** — `requireSupabaseAuth`. Verify `aide_id = userId` AND status in (`pending_offer`, `pending_payment`); delete the booking row via `supabaseAdmin`. The existing `sync_host_availability_from_booking` trigger releases the held date on delete-cascade fallback; if not, also `DELETE FROM host_availability WHERE booking_id = …`. Mark any related `messages.custom_offer` attachment as withdrawn (best-effort).
- Update `listMyTripBookingsLearner`, `listMyTripBookingsAide`, `listAllTripBookingsAdmin` to include `completed` (and keep `pending_offer` for the captain so custom offers show up).
- Add **`listMyReviewedBookingIds()`** (mirrors `getMyReviewedOrderIds`).
- Extend `TripBookingSummary` with a `source: "instant_book" | "custom_offer"` flag derived from whether a `messages` row with `attachment_type='custom_offer'` exists for the booking (or whether status ever was `pending_offer`).

`src/lib/reviews.functions.ts`:

- **`submitTripReview({ booking_id, rating, title, description })`** — verify booking belongs to learner and is `completed`; insert `reviews` row with `booking_id` and `listing_id = trip_packages.id`, `aide_id` from booking.

## 3. Review dialog

- New `WriteTripReviewDialog` (clone of `WriteReviewDialog`) taking `bookingId` + `tripTitle`; calls `submitTripReview`; invalidates `["my-reviewed-bookings"]` and `["learner-trip-bookings"]`.

## 4. Captain schedule UI (`dashboard.upcoming-sessions.tsx`)

Refactor to a single top-level Upcoming/Completed tab set; remove the duplicate trip-bookings section above the tabs.

```text
My Schedule
 ├── Tab: Upcoming
 │     ├── Trip Bookings table (status ≠ completed)
 │     └── Course Schedule (existing upcomingRows)
 └── Tab: Completed
       ├── Trip Bookings table (status = completed)
       └── Course Schedule (existing completedRows)
```

Trip Bookings table columns (both tabs):

| Date | Trip Type | Angler | Guests | Status | Earnings | Action |

- **Trip Type** renders as `"{trip_title} (Instant Book)"` or `"{trip_title} (Custom Offer)"` based on the new `source` flag.
- **Status** badge: Pending Offer / Pending Payment / Confirmed / Completed.
- **Action** column:
  - `pending_offer` → **Cancel Offer** button → `cancelPendingTripOffer`, optimistic remove + toast.
  - `confirmed` AND `trip_date < today` → **Mark as Complete** button → `markTripBookingComplete`, moves row to Completed tab.
  - Otherwise → no action.
- All mutations invalidate `["aide-trip-bookings", user?.id]`.

The existing course-schedule "Mark complete" flow stays inside the Upcoming tab's course table only.

## 5. Angler bookings UI (`dashboard.learner.bookings.tsx`)

- Add a `Completed` badge when `b.status === 'completed'`.
- Fetch `listMyReviewedBookingIds` in parallel.
- For each completed booking, render a prominent **Write a Review** button (Star icon, primary variant) unless its id is in the reviewed set.
- Button opens `WriteTripReviewDialog` for that booking; on submit the queries invalidate and the button disappears.

## 6. Earnings / admin consistency

- `dashboard.earnings.tsx`: include `completed` in the trip revenue filter (currently only `confirmed`).
- `admin.transactions.tsx`: already renders from the list function, so it picks up `completed` automatically once the list-function filter is widened.

## Out of scope

- No Stripe/refund work — cancelling a `pending_offer` only deletes the row (no charge exists yet).
- Course/order flow untouched; order reviews still use the existing `submitReview`.
