## Move "Create a Listing" wizard from `/mentor/create-path` → `/create-listing/new`

The route at `/mentor/create-path` is the listing-creation wizard. We'll move it under the existing `/create-listing` informational landing page so the URL reads clean to public users and the landing page stays intact. Sidebar label also gets updated.

### 1. Promote `/create-listing` to a layout

Rename `src/routes/create-listing.tsx` → `src/routes/create-listing.index.tsx` (no other change). This makes `/create-listing` an index leaf and frees the parent path for nesting.

> Note: TanStack flat-file routing automatically treats `create-listing.tsx` as a leaf and `create-listing.index.tsx` + `create-listing.new.tsx` as siblings under the path prefix — no explicit layout file is required.

### 2. Move the wizard

Rename `src/routes/mentor.create-path.tsx` → `src/routes/create-listing.new.tsx`.

Inside the file:
- `createFileRoute("/mentor/create-path")` → `createFileRoute("/create-listing/new")`
- The internal redirect `navigate({ to: "/login", search: { redirect: "/mentor/create-path" } })` → use `"/create-listing/new"`

### 3. Update every reference in the codebase

Replace `"/mentor/create-path"` with `"/create-listing/new"` in:

- `src/lib/content.ts` (footer/nav link)
- `src/lib/admin.functions.ts` (2 email edit URLs)
- `src/routes/sitemap[.]xml.ts`
- `src/routes/c.$categorySlug.$listingSlug.tsx`
- `src/routes/onboarding.choice.tsx`
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/dashboard.my-listing.tsx` (4 instances)
- `src/routes/_authenticated/dashboard.aide.courses.tsx` (5 instances)
- `src/components/dashboard/WorkspaceSidebar.tsx`
- `src/components/layout/UserAvatarMenu.tsx`
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/operator-listing/PreviewBanner.tsx`

The auto-generated `src/routeTree.gen.ts` will regenerate on the next build — not touched manually.

### 4. Sidebar label

In `src/components/dashboard/WorkspaceSidebar.tsx` line 50, change `title: "List Your Trip"` → `title: "Listing Details"` (same line where we update the `to` path).

### Out of scope

- No redirect from old `/mentor/create-path` URL (any existing email edit links sent before this change won't resolve; admin emails get the new URL going forward).
- No copy changes on the landing page itself.
- No changes to other `/mentor/*` routes (`mentor-faqs`, `mentor-agreement`, `become-a-mentor`, `m.$mentorSlug`).