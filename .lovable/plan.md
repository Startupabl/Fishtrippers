## Goal

Add a "How Bookings Work" link next to the **Trip availability and prices** heading on the operator listing (preview / edit / view). Clicking it opens an in-page popup with angler-focused copy, fully editable from the existing Admin → Settings → Pages CMS.

## Changes

### 1. Seed CMS page (migration)
Insert one row into `site_pages` (idempotent `ON CONFLICT DO NOTHING`):
- slug: `how-it-works-for-anglers`
- title: `How Bookings Work for Anglers`
- category: `resources`
- status: `live`
- content_html: full provided copy marked up with `<h2>`, `<h3>`, `<p>`, `<ul>`, `<li>`, `<strong>` (sections: Browse and Choose, Check the Booking Type — Instant Book / Request to Book, Double-Booking Protection)

Editable anytime from Admin → Settings → Pages.

### 2. Generalize the existing dialog
Rename `src/components/dashboard/HowBookingsWorkDialog.tsx` → `src/components/HowBookingsWorkDialog.tsx` and add two optional props:
- `slug?: string` (default keeps the captain slug for backward compat)
- `title?: string` (dialog header)

Update the one existing import in `dashboard.master-calendar.tsx` to the new path. Behavior unchanged — still fetches via `useServerFn(getLivePageBySlug)` keyed by slug, renders sanitized HTML, Close button.

### 3. Wire the angler link into `TripsBlock`
In `src/components/operator-listing/TripsBlock.tsx`:
- Import `HelpCircle`, `Button`, and `HowBookingsWorkDialog`.
- Convert the `TripsBlock` function to include local `open` state (small refactor — add a tiny wrapper or convert to a component with `useState`).
- Render the heading row as a flex row: heading on the left, a small ghost `Button` with `HelpCircle` icon labeled **"How Bookings Work"** on the right (stacks under heading on mobile).
- Mount `<HowBookingsWorkDialog open={open} onOpenChange={setOpen} slug="how-it-works-for-anglers" title="How Bookings Work for Anglers" />`.

Because `TripsBlock` is shared, the link appears automatically on preview, edit, and public view pages — no per-route wiring needed.

## Result

One angler-facing "How Bookings Work" link beside the Trip availability heading on every listing surface, opening an in-page modal users can dismiss to stay on the page. Copy editable from Pages CMS via slug `how-it-works-for-anglers`. No schema changes beyond seeding one row, no new routes.
