## Goal

Make every page feel less cramped by widening the standard content container and trimming side padding, applied consistently across the catalog, dashboard pages, hero, header, and footer.

## Change

Replace the shared container pattern globally:

- `max-w-[1400px]` → `max-w-[1600px]` (≈100rem; bigger than `max-w-7xl` (80rem), close to your `max-w-[90rem]` suggestion but a bit roomier so 1440-px laptops feel spacious without edge-to-edge stretch on 27" monitors)
- `max-w-[1200px]` (only used on `dashboard.my-listing`) → `max-w-[1600px]` for consistency
- Horizontal padding pattern `px-4 md:px-8` → `px-4 md:px-6 lg:px-8` so md screens (768–1023) get tighter side gutters and only very large screens keep the 8-unit padding

This pattern appears in ~24 spots across `src/routes/**` and `src/components/layout/SiteHeader.tsx` + `SiteFooter.tsx`. All of them get the same swap so header, hero, search/trip catalog, all dashboard pages, footer, and auth-only pages line up.

## Files touched (search/replace, no logic changes)

Layout shell:
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/SiteFooter.tsx`

Home / hero / search:
- `src/routes/index.tsx` (4 occurrences incl. hero block at line 358 and CTA sections)
- `src/routes/search.tsx`

Dashboard + authenticated pages:
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/dashboard.learner.tsx`
- `src/routes/_authenticated/dashboard.learner.purchases.tsx`
- `src/routes/_authenticated/dashboard.learner.schedule.tsx`
- `src/routes/_authenticated/dashboard.favorites.tsx`
- `src/routes/_authenticated/dashboard.earnings.tsx`
- `src/routes/_authenticated/dashboard.upcoming-sessions.tsx`
- `src/routes/_authenticated/dashboard.messages.tsx`
- `src/routes/_authenticated/dashboard.aide.courses.tsx`
- `src/routes/_authenticated/dashboard.my-listing.tsx` (also 1200→1600)
- `src/routes/_authenticated/dashboard.listings.$journeyId.showcase.tsx`

## Out of scope

- Narrower content surfaces that are intentionally reading-width: `m.$mentorSlug` (5xl article), `booking-review` (5xl form + 6xl header bar), `checkout.success`, `journey-welcome`, `operator.preview`, `mentor.create-path`, `dashboard.listings.$journeyId.coupons` (4xl form), `HeroBookingBar` (5xl pill), `BottomNav`. These are constrained by content type (forms, single-column reading), not by the global page chrome, so we leave them alone.
- No changes to card grids, typography, or per-section internal padding.

## Verification

After the swap, spot-check at 1440px and 1920px:
- Header logo + nav align with the page content below (same gutter)
- `/search` trip catalog grid extends further toward the edges
- `/dashboard` and `/dashboard/earnings` match the catalog width
- Hero image content block on `/` lines up with the rest of the homepage
