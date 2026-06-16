# Operator Listing Preview Page

Replace the current post-submit `SubmittedScreen` flow with a full listing preview that mirrors a real public listing. The preview becomes the "after submit" experience and doubles as the template we'll later use for the live public listing.

## Where it lives

- New route: `/operator/preview` (authenticated). Renders for the signed-in operator using their own onboarding/operator record.
- After `ReviewSubmitStep` submits successfully, navigate here (replace today's success toast → `SubmittedScreen` redirect).
- `SubmittedScreen`'s success messaging collapses into a small toast + the sticky banner on this page — no separate confirmation screen.

## Page structure (top → bottom)

1. **Sticky Preview Banner** (full-width, high-contrast, `position: sticky; top: 0`)
   - Text: "You are currently in Preview Mode. This is how your listing will appear to guests."
   - Buttons: `Edit Listing` → `/mentor/create-path` (jumps back into wizard with state hydrated from store), `Publish / Save` (finalizes; for now triggers the existing submit-for-review path if not already submitted, otherwise shows status pill: Pending review / Approved).

2. **Header + Gallery** (listing1.jpg)
   - Title row: `display_name` + green Verified badge (only if operator status = approved).
   - Sub row: `location` + `Show map` link (anchors to a map block / opens dialog — stub for now).
   - Right side: Share icon + `Select your trip` button anchor-scrolling to `#trips`.
   - Gallery: full-width 1-large + 6-thumb grid. Empty state with `Upload Gallery Images` CTA when no media (we have none collected yet).

3. **Sticky Section Nav** (listing2.jpg) — anchors: Trips & Prices, Targeted Species, Boat Info, What's Biting, What's Included, Contact Captain. Sticky below banner.

4. **About + Captain card + Features** (per user note, sits directly below gallery)
   - Left column: `About Your Guide` (individual) or `About Our Charter` (charter) — title chosen from `business_type`. Body = `about`.
   - Right column stack:
     - Captain card: avatar, "Captain {name}", years of experience (placeholder if absent), ID-verified line (if approved), `Contact captain` button → opens `InquiryDialog`.
     - Popular Features card: rendered from `vessel.features` (charters only). Hidden entirely if empty.

5. **Trip Availability** (`#trips`, listing3.jpg + listing4.jpg)
   - Search/filter row (date, days, group size) — visual only for preview.
   - Trip cards from `trip_packages` (when present); empty state CTA "Add your first trip" otherwise.

6. **Modular blocks (conditional, only render if data exists)**
   - **Targeted Species** — icon/photo grid from `target_species`.
   - **Boat Info** — boat type (subcategory + icon), manufacturer, year, length, engines × HP, cruising speed, capacity.
   - **What's Included / Amenities** — icon grid from `BOAT_FEATURE_GROUPS` matched against `vessel.features`.
   - **FAQs** — hidden (no data yet); leave a `// TODO` placeholder component.
   - **Your Captain (extended)** — hidden for individuals; for charters renders only if extra captain bio exists (none today → hidden).
   - **What's Biting** — stub block with "Coming soon" note, ready for future API.
   - **Policies** — Cancellation policy mapped from `cancellation_policy` via `CANCELLATION_POLICY_DETAILS`; static "Listing Policies" (pickup, smoking, etc.) as a standard accordion.

## Data wiring

Hydrate from two sources in parallel inside the route loader (TanStack Query):
- `useOperatorOnboardingStore` (local draft) — used as fallback / live edit reflection.
- A new server fn `getMyOperatorListing` returning operator + vessel + trip_packages + boat_type join. Source of truth once submitted.

Field map:
- `display_name`, `location`, `about`, `business_type` → operator row.
- `primary_category`, `target_species` → operator row.
- `vessel.*` + `boat_types.subcategory_name` + `icon_url` → Boat Info + What's Included.
- `cancellation_policy` → Policies block.
- `trip_packages[]` → Trip Availability cards.
- Gallery, FAQs, captain bio, what's-biting → not yet collected → render empty/CTA states.

## Files

New:
- `src/routes/_authenticated/operator.preview.tsx` — route + loader + head.
- `src/components/operator-listing/PreviewBanner.tsx`
- `src/components/operator-listing/HeaderGallery.tsx`
- `src/components/operator-listing/SectionNav.tsx` (sticky)
- `src/components/operator-listing/AboutBlock.tsx`
- `src/components/operator-listing/CaptainCard.tsx`
- `src/components/operator-listing/FeaturesCard.tsx`
- `src/components/operator-listing/TripsBlock.tsx`
- `src/components/operator-listing/SpeciesGrid.tsx`
- `src/components/operator-listing/BoatInfoBlock.tsx`
- `src/components/operator-listing/AmenitiesGrid.tsx`
- `src/components/operator-listing/PoliciesBlock.tsx`
- `src/components/operator-listing/WhatsBitingStub.tsx`
- `src/lib/operator-listing.functions.ts` (`getMyOperatorListing`).

Edited:
- `src/components/operator-onboarding/steps/ReviewSubmitStep.tsx` — on success: `navigate({ to: "/operator/preview" })` instead of just setting `submitted`.
- `src/components/operator-onboarding/SubmittedScreen.tsx` — keep but only show if user lands on `/mentor/create-path` after submit without going through preview (fallback).

## Out of scope (this turn)

- Real photo/video uploads, FAQs editor, captain extended bio, what's-biting API, map drawer, share dialog wiring (stub buttons).
- Public listing route (`/c/...`) refactor — preview lives at `/operator/preview` first; public route can adopt the same blocks in a follow-up.
- Design tokens / brand polish pass — first pass uses existing semantic tokens.

## Technical notes

- All blocks are pure presentational components that accept typed props and render nothing when their data is empty (single `if (!data) return null` per block) — this is the "modular" guarantee.
- Sticky banner + sticky section nav: stack with `top-0` and `top-[banner-height]` respectively; use CSS var for banner height.
- Anchor scroll: native `href="#trips"` + `scroll-margin-top` on section roots to clear the sticky chrome.
- Conditional title for About uses `business_type` from operator row, falling back to onboarding store while unsubmitted.
