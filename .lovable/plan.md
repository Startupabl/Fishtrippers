## Goal

Lock in the FishTrippers visual identity everywhere: **deep ocean blue as the primary brand color**, **gold as the accent only**, and the **FishTrippers wordmark** replacing every "Lemonaidely" reference in UI, metadata, emails, and seeded backend content.

## What's already in place

- `src/styles.css` already defines `--primary` as ocean navy and `--accent` as gold.
- `src/lib/brand.ts` already exports `BRAND.name = "FishTrippers"` and the ocean/gold palette.
- `src/components/brand/Logo.tsx` already renders the "Fish" + "Trippers" wordmark (gold).

The work below enforces those tokens consistently and scrubs leftover "Lemonaidely" strings from 58 files.

## 1. Color enforcement (frontend)

- Sample the hero image's deep water and the existing gold CTA, then nudge `--primary` and `--accent` in `src/styles.css` (light + dark) so they match precisely. Keep oklch format.
- Audit components for hardcoded color classes that bypass tokens:
  - `bg-yellow-*`, `text-yellow-*`, `border-yellow-*`, `bg-amber-*` → reserve only for true accent/CTA highlights; everything else (sidebars, nav, page chrome, section backgrounds, info pills, focus rings) routes to `primary`/`secondary`/`muted`.
  - `bg-blue-*`, `bg-sky-*`, hardcoded hex colors → swap to `bg-primary`, `text-primary`, `bg-primary/10`, etc.
- Sidebar tokens (`--sidebar`, `--sidebar-primary`, `--sidebar-ring`) get a blue-leaning treatment; gold is used only for the active-state indicator/highlight, not as the sidebar fill.
- Components touched (representative, not exhaustive): `WorkspaceSidebar`, `SiteHeader`, `SiteFooter`, `AuthLayout`, dashboard cards, status badges, admin queue/listings chrome, marketing hero CTAs, pricing/upsell blocks.
- Buttons: confirm the shadcn `Button` `default` variant resolves to `bg-primary` (blue) and add/keep a `gold`/`accent` variant for the small set of conversion CTAs ("Book now", "List your trip"). Remove ad-hoc gold styling on non-CTA buttons.

## 2. Logo + brand-name swap (UI strings)

Every user-visible "Lemonaidely" → "FishTrippers", and every wordmark spot uses `<Logo />`:

- Route `head()` titles, meta descriptions, og:title/og:description, og:url, canonical links (`index.tsx`, `search.tsx`, `register.tsx`, `login.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `journey-welcome.tsx`, `gift.tsx`, `pages.$slug.tsx`, `onboarding.*`, `messages.*`, all `_authenticated/*` routes, `_admin/admin.queue.tsx`, etc.). URLs change `lemonaidely.com` → `fishtrippers.com`.
- `src/routes/sitemap[.]xml.ts` BASE_URL.
- `src/lib/content.ts` (footer labels, About/Manifesto/Privacy/Terms copy, social links). Rewrite the lemon/juice metaphors into fishing-trip language while keeping section structure intact.
- `src/lib/email-templates.defaults.ts` and `src/lib/email-sender.server.ts` (`FROM_ADDRESS`, subject lines, body copy).
- Component-level strings: `SiteFooter`, `AuthLayout`, `ProfileCompletionRedirector`, `ListingLiveCelebrationDialog`, `RejectListingDialog`, `ReceiptDialog`, `AddToCalendarMenu`, `SharePath`, share/og copy in `c.$categorySlug.$listingSlug.tsx` and `m.$mentorSlug.tsx`.
- The `localStorage` key `lemonaidely_quiz_open` in `index.tsx` → `fishtrippers_quiz_open`.
- `index.tsx` hero section: rename `LemonaidelyProcess` component and the visible "What is Lemonaidely?" heading/video title.

Anywhere a text wordmark is currently rendered inline, replace with `<Logo />` for consistency.

## 3. Backend content (Supabase)

Two seed migrations contain Lemonaidely copy: `20260515184833_*.sql` (site_pages seed) and `20260603084741_*.sql` (email_templates seed). Old migration files are immutable history — instead, add **one new migration** that updates the currently-seeded rows in place:

- `UPDATE public.site_pages SET title=..., description=..., body=... WHERE slug IN (...)` to rewrite About / Privacy / Terms / Safety / FAQ / Contact pages with FishTrippers language.
- `UPDATE public.email_templates SET subject=..., body=... WHERE ...` to scrub Lemonaidely from subject lines and bodies.
- No schema changes, no new tables, no RLS edits.

## 4. Verification

- `rg -i "lemonaidely" src supabase` returns zero hits after the pass (allowing only historical migration files, which we leave untouched).
- `browser--screenshot` the home page, an auth page, the dashboard, the admin listings page, and one marketing/legal page to confirm: blue dominates, gold appears only on CTAs/accents, the FishTrippers wordmark renders everywhere a logo is shown.
- Spot-check dark mode for the same pages.

## Out of scope

- No new features, no route restructuring, no database schema changes.
- No new domain registration — URL string change only; actual DNS/hosting is a deploy-time concern.
- Hero image is not regenerated; we sample its blue, we don't replace it.

## Technical notes

- All color edits go through CSS tokens in `src/styles.css` and the shadcn `Button` variants. No raw hex values land in components.
- Brand strings continue to flow through `src/lib/brand.ts` where possible; for route `head()` titles (which are static strings) we update the literals directly.
- The new SQL migration follows the existing GRANT pattern — but since it only UPDATEs existing rows in `public.site_pages` / `public.email_templates`, no new GRANT/RLS work is needed.
