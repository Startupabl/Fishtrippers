## Goal

Confirm the "Write a Review" button is wired to the existing review system (no admin pre-approval), and make sure Listing Cards everywhere flip from the static "Verified" baseline to a real average rating once any reviews exist.

## Findings

- **Write a Review button** on `dashboard.learner.bookings.tsx` (Past Trips) already opens `WriteTripReviewDialog`, which calls `submitTripReview` in `src/lib/reviews.functions.ts`. Submitted rows land in `public.reviews` and immediately appear in:
  - The listing page review feed (`ListingReviews` → `getListingReviews`)
  - The admin panel (`/admin/reviews` → `listAdminReviews`, with view/edit/delete)
  This part is already done — no code change needed.
- **Listing cards**:
  - `OperatorCard` already toggles: `review_count >= 1` → dynamic ⭐ + `(N reviews)`; else → static star + "Verified". ✓
  - `LiveJourneyCard` only renders the dynamic star block when `review_count > 0` and has **no Verified baseline**. ✗
  - Need to audit any other card component for the same gap.

## Plan

### 1. Confirm review flow (no change)
Leave `submitTripReview`, `WriteTripReviewDialog`, the Past Trips button, the listing-page review feed, and the admin reviews panel exactly as they are. New reviews continue to appear instantly with no moderation step.

### 2. Add the "Verified" baseline to `LiveJourneyCard`
Update `src/components/listings/LiveJourneyCard.tsx` so the rating block always renders:
- `review_count >= 1` → `⭐ {avg.toFixed(1)} (N reviews)` (current behavior)
- else → static star + "Verified" (matches `OperatorCard`)

### 3. Audit other listing card surfaces
Grep for other card components rendering listings (e.g. featured/related/search-result cards) and apply the same conditional pattern so the behavior is uniform site-wide. Likely candidates to check: any card under `src/components/listings/`, `src/components/operator-listing/`, and home/category route components. Only files missing the baseline get edited.

### Out of scope
- No DB changes, no moderation status, no new dialogs, no admin queue changes.

## Technical notes
- Source of truth for card stats stays `operators-search.functions.ts` (operators) and `getListingReviewStats` (journeys/listings). No filter changes.
- `OperatorCard` is the reference implementation for the two states — match its markup/classes for visual consistency.
