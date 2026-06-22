## Cancellation Workflow — Step 1 (Angler self-cancel)

### 1. DB migration
- Add `'cancelled'` to enum `public.booking_status_t`.
- Add columns on `public.bookings`:
  - `angler_written_reason text` (nullable, length-checked ≤ 100 via CHECK or trigger)
  - `cancellation_timestamp timestamptz`
- Allow learners to write the new columns: `GRANT UPDATE (status, angler_written_reason, cancellation_timestamp) ON public.bookings TO authenticated;`
- Update `prevent_booking_field_tampering` trigger? Not needed — it doesn't guard these columns and `status` is already mutable. Existing "Participants update booking status" RLS policy already allows the learner to update their own booking.

### 2. Server function — `src/lib/trip-bookings.functions.ts`
Add `cancelTripBookingLearner` (`createServerFn` + `requireSupabaseAuth`):
- Input (zod): `{ bookingId: string, reason: string (1..100, trimmed) }`
- Verify `bookings.learner_id = context.userId` and current status ∈ {`confirmed`,`pending_offer`,`pending_payment`}.
- Update: `status='cancelled'`, `angler_written_reason=reason`, `cancellation_timestamp=now()`.
- Existing trigger `sync_host_availability_from_booking` already deletes held/booked availability when status transitions out of those states — no extra cleanup needed.

Extend `TripBookingSummary` with `status` already present; add optional `angler_written_reason` / `cancellation_timestamp` (read for past tab display, not required by UI now).

### 3. UI — `src/routes/_authenticated/dashboard.learner.bookings.tsx`
- Upcoming tab `renderAction` (confirmed branch): keep "View Receipt" and add a sibling outline destructive `Cancel Trip` button (XCircle icon) in a small flex row. (Pending-offer branch keeps "Review & Accept Offer" only — cancellation there is handled by declining the offer.)
- New `CancelTripDialog` component (inline or `src/components/bookings/CancelTripDialog.tsx`):
  - Title: "Cancel this trip?"
  - Body: "Are you sure you want to cancel this trip?"
  - Required `<Textarea>` labeled "Briefly state your reason for cancellation:" with `maxLength={100}` and a live `n/100` counter.
  - Footer: "Keep Trip" (secondary) + "Confirm Cancellation" (destructive, disabled until reason trimmed non-empty).
- Mutation via `useMutation(useServerFn(cancelTripBookingLearner))`; on success: toast, close dialog, `queryClient.invalidateQueries({ queryKey: ["learner-trip-bookings"] })`.

### 4. Tab filtering refresh
Update the `useMemo` split so cancelled bookings move to the Past tab:
- `upcoming`: `confirmed | pending_offer | pending_payment`
- `past`: `completed | cancelled`
Add a `CANCELLED` red badge case in `statusBadge`. No "Write a Review" button for cancelled rows — show muted text "Trip cancelled" with the reason in a tooltip/subline.

### 5. Out of scope (future steps)
No refund logic, captain-side cancel, policy fee calculation, or email notifications — those belong to later workflow steps.
