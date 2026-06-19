## Plan

### 1. "Write a Review" wiring (Past Trips tab)
Already complete in `src/routes/_authenticated/dashboard.learner.bookings.tsx` — the Past Trips action button opens the existing `WriteTripReviewDialog`, which calls `submitTripReview` and writes to the same `reviews` table the admin moderation page (`/admin/reviews`) reads from. No code change needed; will verify the path end-to-end and call it out.

### 2. Dynamic review counts on Listing Cards
Aggregate approved reviews per operator and render them in `OperatorCard`. "Approved" maps to rows present in the `reviews` table (admin moderation works by deleting bad rows; surviving rows are the approved set).

**`src/lib/operators-search.functions.ts`**
- Select `owner_id` on the operators query.
- After the operators query, fetch `reviews(aide_id, rating)` for the returned owner ids in one round-trip (server publishable client).
- Compute `{ avg, count }` per `aide_id` and populate the existing `rating` / `review_count` fields on each `OperatorCardDTO` (already in the DTO but currently `null`).

**`src/components/listings/OperatorCard.tsx`**
- Replace the unconditional "Verified" segment with conditional logic:
  - `review_count >= 1` → render a segment with a filled amber star, the average to 1 decimal (e.g. `4.9`), and `(N reviews)`.
  - Otherwise → keep the current static star + "Verified" placeholder.

### Out of scope
- No schema change, no new "approved" column. Admin moderation continues to work via the existing edit/delete flow.
- `LiveJourneyCard` already renders dynamic review counts when present — no change.
- Operator listing detail page review feed (`ListingReviews`) already exists and is unchanged.

### Files touched
- `src/lib/operators-search.functions.ts`
- `src/components/listings/OperatorCard.tsx`