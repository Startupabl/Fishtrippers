# Align site categories with fishing environments

Today the `categories` table is empty and the legacy "Categories" admin page is the only UI managing it. The 7 fishing environments are hard-coded in `src/lib/operators.shared.ts` (`FISHING_ENVIRONMENTS`) and used in the operator onboarding Step 4 multi-select. We'll make the same 7 environments the official site categories and wire them everywhere categories already plug in.

## Canonical list (id → label)

- `inshore` → Inshore
- `nearshore` → Nearshore
- `offshore` → Offshore / Deep Sea
- `flats` → Flats
- `freshwater` → Freshwater
- `rivers_streams` → Rivers & Streams
- `backcountry` → Backcountry

## Changes

1. **Seed the `categories` table** with the 7 rows above (parent-level, no children). Each row gets:
   - `name` = environment label (e.g. "Inshore")
   - `slug` / id-style key kept in sync with the env id so we can map categories ↔ operator filter
   - `is_featured = true` so all 7 surface on the homepage grid
   - `image_url = null` for now (admin can upload images later from the Categories page)
   
   Done via a one-time `INSERT … ON CONFLICT DO NOTHING` so re-running is safe and existing edits aren't clobbered.

2. **Admin Categories page** (`src/routes/_admin/admin.settings.categories.tsx`): no code change — it already lists everything in the table, so the 7 environments appear automatically after seeding and remain editable (rename / replace image / toggle featured).

3. **Homepage featured grid** (`src/routes/index.tsx`): already reads `listFeaturedCategories()` and links to `/search?category=<name>`. After seeding, the 7 environments show up automatically with placeholder imagery until the admin uploads photos.

4. **Search page** (`src/routes/search.tsx` + `src/lib/journeys.functions.ts`): the category facet already filters by name. Replace the legacy journeys-only filter wiring so that when a fishing-environment category is selected, the operator/listing query also filters operators by `fishing_environments @> {<env_id>}`. Mapping uses the canonical id list above (label → id).

5. **Listing detail / category links**: ensure operator listings expose their primary environment as the category slug used in `/c/$categorySlug/$listingSlug` URLs (already supported by the route — just confirm slug generation uses the environment label).

6. **Operator onboarding (Step 4)**: no change — `FISHING_ENVIRONMENTS` stays the source of truth. We just mirror it into the `categories` table.

## Out of scope

- Building a brand-new public operator browse page (search currently still queries the legacy `journeys` table; we'll bolt the environment filter onto it but not redesign the page).
- Sub-categories under environments.
- Auto-uploading category cover images — admin can do that from the Categories page after seeding.

## Question for you

Want me to **delete any existing non-environment categories** during seeding (clean slate), or just **add** the 7 environments alongside whatever is already there? The table is currently empty, so either way the visible result is the same — this is about what happens if you add other categories later.
