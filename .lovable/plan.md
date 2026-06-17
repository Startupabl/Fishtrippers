# Dynamic Header CTA + Onboarding Banner

## 1. Header button becomes status-aware

File: `src/components/layout/SiteHeader.tsx`

- Read listing status with the existing `useHasActiveListingStatus()` hook (already used elsewhere — checks the signed-in user's `operators` row for `draft` / `published`).
- Compute:
  - **Logged out OR signed in with no listing** → label "Create a Listing", link to `/mentor/create-path?new=true` (keep the existing `startNewMentorExpressListing` + `useProfileGuard` click handler for signed-in users; logged-out users just navigate).
  - **Signed in with ≥1 listing** → label "Manage Listing", link to `/dashboard/my-listing` (the captain's dashboard hub). No `guard` / onboarding side effects.
- While the query is still loading for a signed-in user, render the "Create a Listing" variant as the default to avoid a flash to the wrong label.
- Also update the same CTA in `src/components/layout/UserAvatarMenu.tsx` (currently "List Your Trip") and the mobile `src/components/layout/BottomNav.tsx` entry so all primary CTAs stay in sync.

## 2. Green onboarding banner on the creation page

File: `src/routes/mentor.create-path.tsx`

- Add a prominent green info banner at the very top of the page body (above the stepper grid), inside the existing page container.
- Visible only when the user does **not** yet have a listing. Use the same `useHasActiveListingStatus()` hook: render once `isLoaded` is true and `hasListing === false`. If `hasListing === true`, redirect to `/dashboard/my-listing` instead of showing the form (enforces the "never see the creation form again" rule).
- Banner copy (verbatim, with the ⚓ emoji):

  > ⚓ Let's launch your profile! Fill out your business details below to build your primary listing. During this setup, you can also add your first few trips right away. Don't worry if you aren't ready yet—once your listing is live, you can always add, edit, or manage unlimited trips from your Captain's Dashboard!

- Styling: green-tinted card (e.g. `bg-emerald-50 border-emerald-200 text-emerald-900`, rounded, padded), full width of the content column, matching the existing onboarding visual language. No new dependencies.

## 3. Route separation (creation vs. management)

- `/mentor/create-path` — onboarding/creation form. Guard added in step 2 redirects users who already have a listing straight to `/dashboard/my-listing`. The green banner only ever renders here, only for users with no listing.
- `/dashboard/my-listing` — already the captain's dashboard hub (existing `dashboard.my-listing.tsx`, with status table and "+ List Your Trip" / Add Trip controls). No structural changes required; the new "Manage Listing" header button routes here.

## 4. Form structure / initial trips

The existing onboarding flow already includes a `trip_catalog` step (`TripCatalogStep`) where the user can add one or more initial trips during setup, and the dashboard hub already supports adding/editing trips post-launch. No changes needed beyond the routing/banner work above.

## Technical notes

- `useHasActiveListingStatus` lives in `src/hooks/useHasActiveListing.ts` and queries `operators` by `owner_id`. It already treats `status` of `null | "draft" | "published"` as "has listing", which matches the requirement (any active listing flips the CTA).
- The header's existing `useProfileGuard` wrapper stays only on the "Create a Listing" branch; "Manage Listing" is a plain `<Link>` to the dashboard.
- No DB/schema changes. No new server functions.
