## Step 1 — Navigation & Dashboard UI

Scope is UI + a tiny schema field for verification state. The actual My Verifications page is stubbed now and built in a later step.

### 1. Sidebar: "My Verifications"

`src/components/dashboard/WorkspaceSidebar.tsx`
- Add a new item to `aideItems`, placed directly under "My Listing":
  - title: "My Verifications"
  - to: `/dashboard/verifications`
  - icon: `ShieldCheck`
- The Aide workspace already only renders for users who own an operator (captain/guide), so visibility is automatically scoped to those roles.

Create a stub route `src/routes/_authenticated/dashboard.verifications.tsx`:
- Minimal page with title "My Verifications" and a short "Coming soon — upload your credentials here" placeholder. Real implementation lands in the next step.

### 2. Operator verification field

Add a single column so the alert has real state to read:
- Migration: `ALTER TABLE public.operators ADD COLUMN verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified'));`
- Extend `getMyOperator` / existing operator selects to include `verification_status` (already `SELECT *` in `operator-listing.functions.ts`, so just used directly).

### 3. "Pending Action Items" container on My Listing

`src/routes/_authenticated/dashboard.my-listing.tsx`
- Replace the standalone amber "Action Required: Set up How Bookings Work" card (lines ~271–292) with a single **Pending Action Items** card placed at the top of the page (right under the header).
- Container is a stacked checklist. Each row is independently rendered based on its own condition; rows disappear individually as they're completed. The whole container hides when no rows remain.

Row logic:
- **Item A — Availability**: shown when the existing `showCalendarBanner` condition is true (no host_availability rows / availability not configured). Text:
  > Set your schedule and rates in [Manage Availability](/dashboard/master-calendar).
- **Item B — Verification**: shown when `operator.verification_status !== 'verified'`. Text:
  > Upload your credentials in [My Verifications](/dashboard/verifications) to earn your Verified badge.

Visual:
- Card uses the same amber styling already in use (`border-amber-200 bg-amber-50/60`) for consistency.
- Header row: "Pending Action Items" title + short helper line ("Complete these to go live and build trust.").
- Each item rendered as a row with an amber dot/icon (`AlertTriangle` or `Circle`), the sentence, and the inline link styled as an underlined link inside the sentence (not a separate button), matching the wording in the spec.
- Container wrapper: `{(needsAvailability || needsVerification) && <Card>…</Card>}` so it fully unmounts when both are complete.

Reactivity:
- Availability row auto-clears because the existing `listMyHostAvailability` query invalidates when the user updates availability (already wired).
- Verification row auto-clears when `verification_status` flips to `verified`; My Listing's operator query (`my-operator` / `getMyOperator`) is invalidated wherever verification is updated (handled in the later step that builds the verifications page).

### Out of scope (next step)
- Actual My Verifications page (file upload, document review, admin approval flow). This plan only adds the menu entry, the stub route, and the schema field needed to drive the checklist.
