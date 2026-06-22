## Goal
Replace the current 2-tab Queue/Completed view on the Cancellation Disputes admin tab with a 4-step payout pipeline, drive the stage shift automatically off a 60-day clock, and add a manual-payout confirmation flow.

## 1. Data model changes (one migration)

`cancellation_disputes`:
- Extend `cancellation_dispute_status_t` enum with `paid_out`.
- Add `paid_out_at timestamptz` (set when admin confirms payout).
- Use the existing `resolved_at` (already set on approve/deny) as the start of the 60-day hold for approved disputes.

`profiles` (angler payout preferences — currently missing):
- Add `payout_method text` (`ach` | `wallet` | `address`, nullable).
- Add `payout_details jsonb` (free-form: ACH routing/account, wallet handle, etc.). Address fallback uses existing `address_line1/2`, `city`, `state_province`, `postal_code`, `country`.
- A small "Preferred Payout Method" form in the angler profile is out of scope for this change — the admin UI will display whatever exists, plus the mailing address fallback. (Flag if you want me to add the angler-side form too.)

No new tables. RLS unchanged (admins already read all disputes/profiles).

## 2. Stage derivation

Stages are derived in the list query — no scheduled job required, so the shift happens "the exact minute" a record crosses 60 days the next time anyone loads the page:

```text
active   = status = 'pending'
holding  = status = 'approved' AND resolved_at > now() - interval '60 days' AND paid_out_at IS NULL
ready    = status = 'approved' AND resolved_at <= now() - interval '60 days' AND paid_out_at IS NULL
completed = status = 'paid_out' OR status = 'denied'
```

`listAdminCancellationDisputes` gets a `scope: 'active' | 'holding' | 'ready' | 'completed'` param and applies the matching filter. A second tiny server fn `getCancellationDisputeStageCounts` returns all four counts in one round trip for the tab badges.

Optional belt-and-suspenders: a pg_cron job that just touches `updated_at` nightly so realtime subscribers refresh — not required for correctness, skip unless you ask for it.

## 3. Server functions

- `listAdminCancellationDisputes({ scope })` — extend existing fn; include `resolved_at`, `paid_out_at`, and (for `ready`/`completed`) the angler's `payout_method`, `payout_details`, and address columns from `profiles`.
- `getCancellationDisputeStageCounts()` — returns `{ active, holding, ready, completed }`.
- `markCancellationDisputePaidOut({ disputeId })` — admin-only, sets `status='paid_out'`, `paid_out_at=now()`, appends to `admin_notes` ("Manual payout confirmed by <admin> at <ts>"). Invalidates the queue queries.

Admin overview count (`getAdminOverview.pendingCancellationDisputes`) keeps counting only `status='pending'` so the dashboard badge keeps its current meaning. The "Ready for Payout" needs-action signal lives on the Queue page itself (see UI).

## 4. UI (`src/routes/_admin/admin.queue.tsx`)

Replace the current `<ScopeTabs queue|completed>` inside the Cancellation Disputes section with a 4-tab strip:

```text
[ Active Disputes (n) ] [ Holding Pool (n) ] [ Ready for Payout (n) ⬤ ] [ Completed (n) ]
```

- Amber dot + `Needs Action` badge on "Ready for Payout" whenever its count > 0. Same amber badge mirrored on the section header card so it's visible before opening the tab.
- Each tab is a `Table` with stage-appropriate columns:
  - **Active Disputes**: Order #, Listing, Captain, Angler, Booked, Cancelled, Trip Policy, Captain message, Angler reason, Approve / Deny.
  - **Holding Pool**: Order #, Listing, Captain, Angler, Approved on, **Days remaining** (live `60 - daysSince(resolved_at)`, red when ≤ 7), Releases on, View.
  - **Ready for Payout**: Order #, Listing, Captain, Angler, Approved on, Payout due since, **Preferred Payout Details** (method label + copy-buttons for each field; falls back to mailing address block), **Confirm Manual Payment Sent** button → calls `markCancellationDisputePaidOut`.
  - **Completed**: Order #, Listing, Captain, Angler, Final status (Paid out / Denied), Resolved on, Paid out on, View.

Countdown is computed client-side from `resolved_at` (re-renders on a 60s timer); no extra server round-trip.

`Confirm Manual Payment Sent` opens a small confirm dialog ("This logs payout completion and archives the dispute. Continue?") to avoid misclicks, then mutates and invalidates `["admin","queue","cancellations",*]` and the stage-counts query so the row jumps to Completed immediately.

## 5. Files touched

- `supabase/migrations/<new>.sql` — enum value, `paid_out_at`, profile payout columns.
- `src/lib/cancellation-disputes.functions.ts` — `scope` param, stage counts fn, `markCancellationDisputePaidOut`, payout-detail fields in select.
- `src/routes/_admin/admin.queue.tsx` — replace the cancellations section's tabs/columns/actions; add amber needs-action indicator on section header.
- `src/integrations/supabase/types.ts` — regenerated after migration.

## Out of scope

- Angler-side UI to enter payout preferences (flagged above).
- Automatic ACH/Stripe transfer — this flow is manual ("Confirm Manual Payment Sent").
- Changing the structure of the other three queue tabs (listings / inquiries / flags).
