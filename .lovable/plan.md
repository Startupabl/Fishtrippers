# My Schedule — copy + columns update

Scoped to copy and table structure only. No backend, server-function, or data-shape changes. Action buttons stay exactly as they are.

## 1. Dashboard card (`src/routes/_authenticated/dashboard.tsx`)

NavCard at `/dashboard/upcoming-sessions`:
- Title stays `My Schedule`.
- Change `desc` from `"Track your scheduled learner sessions."` → `"Track your scheduled fishing trips."`
- Route already correct.

## 2. Schedule page (`src/routes/_authenticated/dashboard.upcoming-sessions.tsx`)

### Header
- Keep H1 `My Schedule`.
- Replace the current subtitle paragraph with:
  `Every booked trip — including pending custom offers.`

### Table columns

Update `<TableHeader>` and the matching `<TableCell>`s in `ScheduleTableRow`, plus the loading / empty rows' `colSpan` (5 → 7) to use this exact order:

```text
Trip Time | Total Hours | Trip Title | Status | Seats | Client(s) | Action
```

Per-column behavior:

- **Trip Time** — render `fmtSessionTime(row.startIso)` (date + start time) plus the existing Google Calendar icon. Remove the `"{durationMinutes} min · {source}"` subline (duration moves into its own column; source label drops since the new spec doesn't include it).
- **Total Hours** — new cell. Render `row.durationMinutes / 60` formatted to up to 2 decimals with `h` suffix (e.g. `1h`, `1.5h`, `0.75h`). Whole numbers render without trailing zeros.
- **Trip Title** — existing `row.listingTitle` cell, just renamed header.
- **Status** — extend `StatusBadge` to support a `complete` variant in addition to `booked` / `unbooked` / `pending_reschedule`. Header label and badge text use lowercase `booked` / `unbooked` / `complete` as specified. In the Completed tab (or when `mode === "completed"`), the status cell renders the `complete` badge instead of the existing "Completed" pill in the Action column. The standalone "Completed" pill currently shown in the Action cell when `mode === "completed"` is removed (Status column now owns that state); the Action cell shows nothing for completed rows.
- **Seats** — unchanged (`filledSeats/maxSeats`).
- **Client(s)** — existing `Student(s)` cell renamed. The existing single-name render and the multi-passenger `Popover` dropdown ("N students ▾" → list) stay as-is; update the popover heading from `Enrolled students` → `Enrolled clients` and the trigger label from `{n} students ▾` → `{n} clients ▾`. Component name `StudentNameWithMessage` stays (rename is cosmetic only and not requested).
- **Action** — keep every existing action: Edit / Delete (unbooked), Join Classroom + dropdown with Reschedule / Cancel reschedule request / Mark as Complete (booked or pending_reschedule). No additions, no removals.

### Empty / loading rows
Bump `colSpan={6}` → `colSpan={7}` in the loading and empty `<TableRow>`s.

## Out of scope

- No schema changes, no migration.
- `schedule.functions.ts` and `ScheduleRow` type stay untouched.
- Sidebar label, learner-side schedule page, and tab labels ("Upcoming" / "Completed") stay unchanged.
- Renaming internal identifiers like `journeyId`, `StudentNameWithMessage`, `listAideScheduleRows` is out of scope.
