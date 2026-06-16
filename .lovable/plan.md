## Problem

When a user finishes onboarding and clicks "Submit for review," the data is written to the `operators` table. The admin listings page (`/admin/listings`) reads from the legacy `journeys` table, so the submitted listing never appears. The page's columns (Priority, Listing #, Listing, Category, Aide, Status, Stripe Payout, Featured, Manage) also reference fields that don't exist on `operators` yet (`priority_order`, `featured`, `slug`, `course_id_slug`, `cover_image_url`, archived status).

## Goal

Keep the admin listings page UI and behavior identical, but back it with `operators` so submitted listings show up. Rename only the "Aide (User)" column header to "Captain/Guide".

## Plan

### 1. Database migration — extend `public.operators`

Add the columns the admin page needs:
- `listing_number text UNIQUE` — short human ID (format `LST-XXXXXX`), auto-assigned by trigger like `orders.order_number`.
- `slug text UNIQUE` — assigned on approval from `display_name`.
- `featured boolean NOT NULL DEFAULT false`.
- `priority_order integer NOT NULL DEFAULT 0`.
- `status text NOT NULL DEFAULT 'draft'` with values `'draft' | 'published' | 'archived'` (mirrors journeys.status semantics; `submitForReview` keeps `status='draft'`, approval flips to `'published'`, admin archive flips to `'archived'`).
- `cover_image_url text` — first image from `listing-portfolio` for that operator (set at submit/approve time; falls back to first trip cover).

Add the listing-number generator + trigger (sibling of `generate_unique_order_number`/`assign_order_number`) and an index on `(priority_order DESC, created_at DESC)`.

### 2. Server functions — replace journey-based admin fns with operator-based ones

In `src/lib/admin.functions.ts`, add operator-scoped equivalents and switch the page to them:
- `listAdminListings({ moderation })` — selects from `operators`, joins `profiles` for captain name/email + `stripe_connect_id`/`is_payout_ready`, derives `cover_image_url` (column or first trip image), maps `primary_category` → `category`, `display_name` → `title`, `listing_number` → `course_id_slug`-equivalent. Same filter semantics: `archived` → `status='archived'`; `all` → not archived; otherwise `moderation_status = filter`.
- `setListingPriority`, `setListingFeatured`, `setListingModeration`, `archiveListing`, `restoreListing`, `hardDeleteListing` — same shape as the existing journey versions, but updating `operators`.
- Approval path: when `moderation='approved'`, set `status='published'`, assign a `slug` if missing (slugify `display_name`, ensure uniqueness), keep payout-readiness gate (block approval if captain isn't payout-ready). Decline → `status='draft'` and store `moderation_note`. Restore → `status='draft'`, `moderation_status='pending'`.

Keep the legacy journey fns in place (other admin pages may still use them) — just stop calling them from `/admin/listings`.

### 3. Submit flow — fill the new fields

In `submitOperatorForReview` (`src/lib/operators.functions.ts`):
- Keep current upsert.
- Backfill `cover_image_url` if null: list the user's `listing-portfolio/<userId>/` objects (or fall back to first `trip_packages.cover_image_url` for the operator), store the first public URL.
- Leave `status='draft'`, `moderation_status='pending'`, `featured=false`, `priority_order=0` — the trigger assigns `listing_number`.

### 4. Admin listings page

`src/routes/_admin/admin.listings.tsx`:
- Swap server-fn imports to the new `listAdminListings` / `setListing*` / `archiveListing` / `restoreListing` / `hardDeleteListing`.
- Rename the only column header `Aide (User)` → `Captain/Guide`.
- Update the search input placeholder `"Search by aide…"` → `"Search by captain/guide…"` (single visible string; otherwise no UI changes).
- Filter logic, sorting, priority editor, featured toggle, status pill, archive/restore/delete confirms, Stripe payout column — all stay the same; they now read the operator-derived fields.
- The "view" Eye link points to `/operator/preview` (or `/c/<category>/<slug>` once approved) instead of the old journey URL.

### 5. Verify

After the migration runs and the new code lands:
- `Blue Ocean Charters` (the existing pending operator) appears under the Pending tab with a populated Listing #, captain name/email, Offshore category, and a cover image if portfolio uploads exist.
- Approve/decline/archive/restore/feature/priority all work and persist.
- The Aide rename is the only visible header change.

## Out of scope

- No changes to the operator onboarding wizard, preview page, or listing URLs beyond the admin "view" link target.
- The legacy `journeys`-based admin views (orders, other admin tabs) are untouched.
