## Goals

1. When an angler cancels a trip, the captain gets (a) a header alert and (b) an email.
2. Add a 4th "Cancellation Disputes" card to the Admin Overview, with a live count of pending (not-yet-reviewed) disputes.
3. In the Admin Action Queue → Cancellation Disputes tab, show three additional fields on each dispute card: **Booked:** (original trip date/time), **Cancelled:** (timestamp the angler submitted the cancellation), and **Trip Policy:** (the captain's cancellation policy — flexible / moderate / strict).

## Changes

### 1. Captain notification on angler cancellation
File: `src/lib/trip-bookings.functions.ts` → `cancelTripBookingLearner` handler.

After the booking is updated to `cancelled`, run a best-effort block (wrapped in try/catch so the cancel itself never fails) that:
- Looks up `aide_id`, trip title (from `trip_packages`), `trip_date`, and the captain's email/first name (from `profiles` / `auth.users`).
- Inserts a `user_alerts` row for the captain. We need a new enum value `trip_cancelled_by_angler` on `public.user_alert_kind` — added via a tiny migration (`ALTER TYPE ... ADD VALUE`). Alert message: `"An angler cancelled their booking for \"<trip title>\" on <trip date>. Reason: <reason>"`.
- Sends an email via the existing `sendEmail` helper to the captain with subject `"A guest cancelled their FishTrippers booking"` and a short body restating trip title, original date, cancellation reason, and a link to `/dashboard/upcoming-sessions` so they can review and (if appropriate) file a dispute.

### 2. Admin Overview — add Cancellation Disputes stat card
File: `src/lib/admin.functions.ts` (`getAdminOverview`):
- Add a parallel `count` query against `cancellation_disputes` where `status = 'pending'`.
- Return `queue.pendingCancellationDisputes`.

File: `src/routes/_admin/admin.index.tsx`:
- Widen the StatCard `manageSearch` prop type to include `"cancellations"`.
- Include `pendingCancellationDisputes` in `queueTotal`.
- Add a 4th row to the Action Queue card: `{ label: "Cancellation Disputes", value: String(data.queue.pendingCancellationDisputes) }`.
- (Card layout stays single Action Queue card; the count is the row value, which highlights red when > 0 via the existing `alertRows` logic.)

### 3. Admin Queue — extra fields per dispute
File: `src/lib/cancellation-disputes.functions.ts` (`listAdminCancellationDisputes`):
- Select `cancellation_timestamp` from bookings (already selected: add it).
- Join `operators` by `owner_id = booking.aide_id` to fetch `cancellation_policy`.
- Extend `CancellationDisputeRow` with:
  - `trip_date: string | null` (already there — keep, used for "Booked")
  - `cancellation_timestamp: string | null`
  - `cancellation_policy: "flexible" | "moderate" | "strict" | null`

File: `src/routes/_admin/admin.queue.tsx` (`CancellationDisputes`):
- In the details grid, add three rows:
  - **Booked:** formatted `trip_date` (date + time if available).
  - **Cancelled:** formatted `cancellation_timestamp`.
  - **Trip Policy:** capitalized policy name, with a "—" fallback.

### 4. Migration
Single small migration:
```sql
ALTER TYPE public.user_alert_kind ADD VALUE IF NOT EXISTS 'trip_cancelled_by_angler';
```

## Out of scope
- No changes to the angler-facing cancel flow UI.
- No changes to dispute submission flow.
- No new admin role checks (existing `has_role` gating is reused).
