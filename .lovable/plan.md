## Add Admin "Availability Manager" page

### 1. Sidebar nav (`src/routes/_admin.tsx`)
- Insert a new entry right below Transactions in the `NAV` array:
  `{ to: "/admin/availability", label: "Availability Manager", icon: CalendarClock, exact: false }`
- Add matching branch in `pageTitle()` returning `"Calendar Availability & Hold Logs"`.
- Import `CalendarClock` from `lucide-react`.

### 2. New route `src/routes/_admin/admin.availability.tsx`
- `createFileRoute("/_admin/admin/availability")` — page component titled **"Calendar Availability & Hold Logs"**.
- Data loaded via TanStack Query calling a new server function `listAvailabilityHolds` (see §3).
- UI:
  - Top search input (controlled, client-side filtering) matching captain name or trip type substring (case-insensitive).
  - Table with columns: Captain Name · Trip Type · Trip Date & Time (guide timezone) · Block Reason · Status badge · Expiration / Countdown · Actions.
  - Status badge styles: BOOKED (green), BLOCKED (slate), HELD (amber).
  - For HELD rows, render a live `useEffect` countdown ("Expires in 4h 12m") computed from `offer_expires_at`; otherwise "N/A".
  - For HELD rows, show a `Release Hold` button → AlertDialog confirmation → calls `releaseAvailabilityHold` server fn → invalidates query + toast.
  - Empty state and loading skeleton.

### 3. Server functions `src/lib/admin-availability.functions.ts`
Both guarded by `requireSupabaseAuth` + `has_role(_,'admin')` check (throw if not admin).

- `listAvailabilityHolds()` — runs as admin via `supabaseAdmin` (loaded dynamically inside handler):
  - Query `host_availability` where `date >= current_date` and status ∈ ('booked','blocked','held').
  - Join operator → owner profile for captain name + `operators.timezone`.
  - Join booking → `trip_packages` (for trip title) and `class_sessions` (for date/time) and learner profile (for "sent to <name>").
  - Build rows in JS:
    - **Trip Type**: `trip_packages.title` when `course_id` present; otherwise `"Custom Trip"`.
    - **Trip Date/Time**: use `class_sessions.session_dates_times_array[0]` when present, else `bookings.trip_date`; format in operator timezone (`Intl.DateTimeFormat` with `timeZone`).
    - **Block Reason**: 
      - HELD + custom (no course_id) → `"Custom Trip Sent to <Angler Name>"`
      - HELD + course_id → `"Pending Payment – Booking #<short id>"`
      - BOOKED → `"Direct Booking #<short id>"`
      - BLOCKED → `"Manual Block"`
    - **offerExpiresAt**: for HELD with custom-offer message, look up latest `messages.offer_expires_at` for that `booking_id` where `attachment_type='custom_offer'`. Filter out rows whose `offer_expires_at < now()` (performance/freshness rule).
  - Return sorted by date asc.

- `releaseAvailabilityHold({ id })`:
  - Verify the row exists with `status='held'`, then `DELETE FROM host_availability WHERE id = $1`.
  - Return `{ ok: true }`.

### 4. Verification
- Submit a Custom Trip → row appears in /admin/availability as HELD with countdown.
- Click Release Hold → confirm → row disappears, captain calendar freed.
- Search filters in real time.
- Past-dated and expired holds are excluded.

### Technical Notes
- Use existing helpers: `Badge`, `AlertDialog`, `Input`, `Table` from shadcn.
- Countdown updates via single `setInterval(60_000)` re-render in the page component.
- Timezone formatting:
  ```ts
  new Intl.DateTimeFormat('en-US', {
    timeZone: operator.timezone || 'UTC',
    dateStyle: 'medium', timeStyle: 'short'
  }).format(date)
  ```
- No schema migration required — `host_availability` already supports the three statuses.
