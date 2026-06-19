
## What went wrong

The new file `src/routes/_authenticated/booking.review.tsx` (path `/booking/review`) collides with the legacy file `src/routes/_authenticated/booking-review.tsx` (path `/booking-review`). TanStack Router's route-tree generator turns both into the same symbol name (`AuthenticatedBookingReviewRoute`), which is why the build failed and your preview is still serving the old page.

The legacy `/booking-review` page is the **Aide / course custom-offer** flow (different product). It's still used in 5 places: `bookings.functions.ts` (Stripe cancel URL), `cohorts.functions.ts` (comment), `c.$categorySlug.$listingSlug.tsx`, `CustomOfferCard.tsx` (×2), and an admin settings note.

## Fix (one small rename, no UX impact)

Rename the new trip-booking page so its symbol is distinct, then point `CheckDatesDialog` at the new path. I'll use **`/booking/checkout`** — clear, descriptive ("Booking Review & Checkout Summary"), and avoids the collision.

### Files

1. `git mv src/routes/_authenticated/booking.review.tsx → src/routes/_authenticated/booking.checkout.tsx`
2. Update `createFileRoute("/_authenticated/booking/review")` → `createFileRoute("/_authenticated/booking/checkout")` inside that file. Update `title` meta if needed (keep "Review your booking").
3. In `src/components/operator-listing/CheckDatesDialog.tsx`, change `to: "/booking/review"` → `to: "/booking/checkout"`.
4. In `src/lib/trip-bookings.functions.ts`, update the Stripe `cancel_url` from `/booking/review?...` → `/booking/checkout?...`.

The legacy `/booking-review` (Aide course flow) is left untouched.

## Alternative (only if you want)

If you'd rather keep the URL `/booking/review` exactly, I can instead rename the legacy file to `course-booking-review.tsx` (path `/course-booking-review`) and update its 5 call sites. That's higher-risk because it touches the chat custom-offer flow. **Default is the small rename above** — say the word if you'd prefer the alternative.
