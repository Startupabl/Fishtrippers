# Captain/Guide Dashboard — wire to operator listings

## Goal

1. In the avatar dropdown, rename "Become an Aide" → **List Your Trip**, and when the user has an operator listing show **Captain Dashboard** (business) or **Guide Dashboard** (individual/guide) instead of "Go to Aide Dashboard".
2. Apply the same Captain/Guide labelling across the workspace sidebar and dashboard header.
3. Make the dashboard actually work for users who submitted an operator listing — the listing they just created should be visible and manageable from the front-end captain/guide dashboard.

## Source of the Captain vs Guide label

The onboarding wizard stores `operators.business_type`:
- `"charter"` (or any business type) → **Captain**
- `"guide"` → **Guide**
- fallback when unknown → **Captain**

A new hook `useOperatorRoleLabel()` returns `{ role: "captain" | "guide", titleCase: "Captain" | "Guide" }` by reading the signed‑in user's `operators` row.

## 1. Detect "has a listing" from operators, not journeys

`src/hooks/useHasActiveListing.ts` currently counts rows in `journeys`. Replace its query with a count of `operators` rows for the signed‑in user where `status in ('draft','published')`. Return the same `{ hasListing, isLoaded }` shape so existing callers keep working.

Add the new `useOperatorRoleLabel()` hook in the same file (single query, cached by `["my-operator", userId]`).

## 2. Dropdown menu (`src/components/layout/UserAvatarMenu.tsx`)

- Section label: when `hasListing` show `"{Role} Zone"` (Captain Zone / Guide Zone), otherwise keep "Earn".
- With listing → link label becomes `"{Role} Dashboard"` and points to `/dashboard`.
- Without listing → label becomes **List Your Trip**, link target stays `/mentor/create-path?new=true`.
- Sprout/LayoutDashboard icons preserved.

## 3. Workspace sidebar (`src/components/dashboard/WorkspaceSidebar.tsx`)

- `useWorkspaceMode()` returns `title: "{Role} Workspace"` when `hasListing`.
- Sidebar group label: `"{Role} Workspace"`.
- "Become an Aide" item (shown when no listing) → **List Your Trip**.
- "My Listings" stays as the entry to the listing manager but points to a new route (see step 5).

## 4. Dashboard shell (`src/routes/_authenticated/dashboard.tsx`)

- `head().title` → `"{Role} Dashboard — Lemonaidely"` (derived from the hook; default Captain on first paint to avoid SSR jitter).
- Inline "Aide Dashboard" heading inside `AideDashboardHome` → `"{Role} Dashboard"`.
- Rename internal helper variable `atAideRoot` → `atOperatorRoot` (cosmetic, keeps grep clean). No URL changes — `/dashboard` stays the same so existing links keep working.

## 5. Operator listing manager — new route `/dashboard/my-listing`

Replace the legacy journey-based "My Listings" page (`dashboard.aide.courses.tsx`) with a new operator-centric page. We keep the file so the route id stays stable but rewrite the body.

What it shows for the signed‑in operator:

- Hero card: cover image (from `operators.cover_image_url`), display name, listing number, moderation badge (Pending / Approved / Action Needed with note), status pill (Draft / Published / Archived), payout-ready indicator.
- Primary actions: **Edit listing** (→ `/mentor/create-path`, resumes the wizard from the stored draft), **Preview** (→ `/operator/preview`), **View public page** (when published, → `/c/<category>/<slug>`).
- **Trip catalog** table: rows from `trip_packages` for this operator, with title, price, duration, status, and an Edit button that opens the existing `TripFormDialog` (reuse the component already used by the wizard).
- **Vessels** mini-list from `vessels` (read‑only summary; edit links into the wizard step).
- Empty state when no operator row exists yet: CTA "List Your Trip".

Sidebar item label changes from "My Listings" to **My Listing** (singular) and `to` becomes `/dashboard/my-listing`. The old `/dashboard/aide/courses` route file is deleted along with the legacy "Courses" sidebar entry.

## 6. Bookings / Earnings / Messages on the operator data model

Per your "Full rebuild" choice, rewire these existing dashboard pages to operator listings instead of journeys.

### 6a. Server functions (`src/lib/operator-dashboard.functions.ts`, new)

All authenticated via `requireSupabaseAuth` and scoped to `operators.user_id = auth.uid()`:

- `getMyOperator()` → `operators` row + business_type, status, moderation, cover, slug, payout flags.
- `listMyTripPackages()` → trips for the operator.
- `listMyBookings({ status?, range? })` → joins `bookings` with `trip_packages` filtered to this operator (resolving via `course_id`/`trip_package_id` — we'll add the resolver in this fn rather than schema changes).
- `getMyEarningsSummary({ range })` → sums `bookings.aide_earnings`, payout status from `getMyStripeIds()`, grouped by trip.
- `listMyMessageThreads()` → existing `message_threads` already keyed to mentor_id = user_id; just relabel the UI.

No DB migration required for this pass — bookings/messages already reference the signed-in user via `aide_id`/`mentor_id`, which equals `operators.user_id`. We're swapping the *labels* and the *filter source* (trip catalog instead of journey catalog) but keeping the underlying rows.

### 6b. Page wiring

- `dashboard.bookings.tsx`: swap `listMyJourneysWithStats` filter dropdown for `listMyTripPackages`; columns unchanged.
- `dashboard.earnings.tsx` + `dashboard.earnings-bookings.tsx`: same swap — group by trip package title; per-listing breakdown reads from the operator's trips.
- `dashboard.messages.*`: header copy "Conversations with your learners" → "Conversations with your guests"; data fetch unchanged.
- `dashboard.upcoming-sessions.tsx`: filter via `trip_packages` instead of `journeys`.

Each page keeps its current URL and layout — only the data source and a few labels change.

## 7. Cleanup

- Remove the legacy `/dashboard/aide/courses` route file once `/dashboard/my-listing` is in place; remove `aideItems` entry pointing at it.
- Strip "Aide" terminology from user‑visible strings in the dashboard (kept only as internal variable names where rename is risky).
- No changes to admin pages, onboarding wizard, or public listing pages.

## Out of scope

- Renaming database tables or columns (e.g. `aide_earnings`, `mentor_id`) — internal only.
- Re-architecting the legacy `journeys` system itself; we just stop surfacing it in the operator dashboard.
- Notifications, reviews, or coupon tooling for trip packages (can follow up).

## Technical notes

- `useHasActiveListing` change is a one-file swap; existing call sites keep their boolean contract.
- `useOperatorRoleLabel()` defaults to `"captain"` while loading so the dropdown/sidebar never flashes "Guide" for charter operators.
- Trip edit reuses the existing `TripFormDialog` component (already standalone — just needs the operator id passed in).
- All new server functions go in `src/lib/operator-dashboard.functions.ts` and use `requireSupabaseAuth`; no edits to `client.ts`/`auth-middleware.ts`.