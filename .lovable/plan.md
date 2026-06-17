## How Bookings Work — in-page popup on Manage Availability + editable CMS content

Keep the host on Manage Availability. The link opens a modal dialog that fetches and renders the CMS page body inline. You still edit the copy from **Admin → Settings → Pages**.

### 1. Seed the CMS page (migration)

Insert into `site_pages` (idempotent with `ON CONFLICT (slug) DO NOTHING`):
- slug: `how-bookings-work-for-guides`
- title: `How Bookings Work for Captains & Guides`
- category: `resources`
- status: `live`
- description: short summary
- content_html: full copy you provided, marked up with `<h2>`, `<h3>`, `<p>`, `<ul>`, `<li>`, `<strong>` (already allow-listed by the sanitizer)

### 2. New component: `HowBookingsWorkDialog`

File: `src/components/dashboard/HowBookingsWorkDialog.tsx`

- shadcn `Dialog` with `max-w-2xl`, scrollable body (`max-h-[80vh] overflow-y-auto`).
- Fetches content via `useServerFn(getLivePageBySlug)` + `useQuery` keyed by slug, only enabled when `open === true` (lazy load).
- States: skeleton while loading, friendly fallback if the page is missing/unpublished, and on success render the sanitized HTML using `dangerouslySetInnerHTML` inside a `prose prose-sm dark:prose-invert` wrapper so headings/lists style correctly.
- Footer: single "Close" button. Dialog closes via overlay / Esc as usual — user stays on `/dashboard/master-calendar`.

### 3. Wire the trigger on Manage Availability

File: `src/routes/_authenticated/dashboard.master-calendar.tsx`

Add a small "How Bookings Work" link/button in the page header (right of the title on desktop, beneath the subtitle on mobile) using a `HelpCircle` icon. Clicking it toggles local `open` state and mounts `<HowBookingsWorkDialog open={open} onOpenChange={setOpen} />`. No navigation, no new tab.

### Result

- One link in the header → opens a modal with the explainer; closing returns the user to the calendar exactly where they were.
- Copy is editable anytime from the existing Pages CMS — change title/body/status without code changes.
- No new admin UI, no schema changes beyond seeding one row.
