## Goal

Reorganize all four Admin Action Queue tabs (Listing Applications, Support Tickets, Flagged Content, Cancellation Disputes) from stacked cards into scannable column tables, and add a **Queue / Completed** sub‑toggle on each so items move from one to the other after the admin takes action.

Yes — this is feasible across every queue tab.

## Layout pattern (applied to all four tabs)

Each tab becomes:

```text
[ Queue (n) | Completed (n) ]   <- sub-tabs inside the main tab

┌────────────────────────────────────────────────────────────────────┐
│ Col A │ Col B │ Col C │ Col D │ Col E │ Messages │ Actions          │
├───────┼───────┼───────┼───────┼───────┼──────────┼──────────────────┤
│ ...   │ ...   │ ...   │ ...   │ ...   │ View ▸   │ [Approve][Deny]  │
└────────────────────────────────────────────────────────────────────┘
```

Built with the existing shadcn `Table` primitives (already used on `admin.listings.tsx` and `admin.users.index.tsx`) so the visual language matches the rest of the admin.

### Columns per tab

**Cancellation Disputes**
Order # · Listing Title · Captain · Booked · Cancelled · Messages (popover/drawer with angler reason + captain response) · Actions (Approve refund / Deny / View)

**Listing Applications**
Listing # · Title · Captain · Submitted · Location · Notes (popover) · Actions (Approve / Deny / Open)

**Support Tickets**
Ticket # · Subject · User · Type · Opened · Last Message (popover) · Actions (Reply / Resolve)

**Flagged Content**
Flag # · Target (listing/review/journey) · Reporter · Reason · Reported · Details (popover) · Actions (Dismiss / Remove / Open)

### Queue vs Completed

- **Queue** = current pending items (today's behavior).
- **Completed** = items where the admin already took a terminal action (approved/denied/resolved/dismissed/removed). For each tab this maps to existing status fields:
  - disputes: `status in ('approved','denied')`
  - listings: `status in ('approved','denied')` after review
  - tickets: `status = 'resolved'`
  - flags: `status in ('dismissed','actioned')`
- Counts shown on each sub-tab pill. Completed list is read‑only with a "Reopen" affordance only where it already exists; otherwise just a "View" link.
- After an admin acts in Queue, the row disappears from Queue and appears in Completed on the next refetch (we already invalidate these queries today).

### Messages column

A compact "View ▸" button opens a popover (desktop) / drawer (mobile) showing the relevant text: angler cancellation reason + captain response for disputes, ticket thread for support, reporter note for flags, applicant note for listings. Keeps the row dense while preserving full context one click away.

### Responsive behavior

- ≥ md: full table with all columns.
- < md: collapses to the current card layout automatically (table hidden, card list shown) so mobile admins aren't squeezed.

## Files to touch

- `src/routes/_admin/admin.queue.tsx` — rewrite the four section components (`ListingsToApprove`, `OpenInquiries`, `FlaggedContent`, `CancellationDisputes`) to use `Table` + Queue/Completed sub‑tabs. Extract a small shared `<QueueShell tab="queue|completed" counts={…}>` wrapper to keep markup consistent.
- `src/lib/cancellation-disputes.functions.ts`, `src/lib/admin.functions.ts`, and the ticket/flag list functions — extend each `list…` server function to accept `{ scope: 'queue' | 'completed' }` and return the matching rows. No schema changes; we filter on existing status columns.
- `src/routes/_admin/admin.index.tsx` — no change to the overview counts (still "pending" only), but the link target stays the same.

## Out of scope

- No database/schema changes, no new statuses.
- No change to the action semantics themselves (Approve/Deny/Resolve do exactly what they do today; we just relocate the row).
- No change to the four top‑level tabs or to other admin pages (listings, users, transactions) — those are already columnar.
