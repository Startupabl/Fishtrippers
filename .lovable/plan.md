# Custom offer cleanup + in-place review for anglers

## 1. Auto-remove cancelled offers from angler's My Bookings

**Good news:** The captain's "Cancel Offer" action (`cancelPendingTripOffer` in `src/lib/trip-bookings.functions.ts`) already **hard-deletes** the booking row (and clears `host_availability`). The angler's `listMyTripBookingsLearner` queries the `bookings` table directly, so once deleted, the row is automatically gone from their My Bookings view.

**What's missing:** the angler's open page won't know until they refetch. Fix by invalidating the learner bookings query when the page re-mounts/focuses (already standard via TanStack Query), and ensure the captain's cancel action's success path is unchanged. No further server work needed beyond confirming behavior — the captain delete is authoritative.

No code change required here unless we want stronger live updates; flagging only.

## 2. Replace "Review & Accept Offer" navigation with an in-place offer dialog

Currently in `src/routes/_authenticated/dashboard.learner.bookings.tsx`, the amber "Review & Accept Offer" button on a `pending_offer` row navigates the angler away to `/dashboard/messages/$threadId`. Change it to open a dialog that renders the existing `<CustomOfferCard bookingId={b.id} viewerId={viewerId} />` — the same popup used in the messages thread — which already supports:

- Confirm & Pay (navigates to `/booking-review`)
- **Decline / Request Changes** (calls `declineBooking`)
- Trip title, slots with dual-zone time, deposit amount in the viewer's preferred currency

### Changes to `dashboard.learner.bookings.tsx`

1. Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`, and `CustomOfferCard` from `@/components/chat/CustomOfferCard`.
2. Add state `const [offerTarget, setOfferTarget] = useState<TripBookingSummary | null>(null)`.
3. Get current viewer id (already available via `useProfileStore` or auth context used elsewhere in the file — reuse the existing pattern).
4. Change the `pending_offer` / `pending_payment` button to call `setOfferTarget(b)` instead of navigating.
5. Render a `<Dialog open={!!offerTarget} onOpenChange={(o) => !o && setOfferTarget(null)}>` near the bottom (next to the existing receipt/review dialogs) containing the `CustomOfferCard` with an `onChanged` callback that refetches the bookings query and closes the dialog if the offer was declined.

No other files change. The CustomOfferCard already handles all auth/server-fn calls and matches the message-thread experience exactly.

## Out of scope

- No DB migration.
- No changes to captain's cancel flow (already hard-deletes).
- No changes to the messages thread offer card.
