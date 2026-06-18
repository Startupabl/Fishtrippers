## Root cause

`HeaderGallery` always fetches photos via `listMyOperatorPhotos` — a server function gated by `requireSupabaseAuth` that returns the photos of the **viewer's own** operator. For a public visitor on `/charters/:location/:businessSlug`:

- If logged out → the call 401s → `photos = []` → "No photos yet" placeholder appears.
- If logged in as a non-owner → returns the visitor's own (or none), never the listing's photos.

The component also defaults `canManage = true`, so the public route renders owner-only controls (Upload / Manage photos).

Additionally, the empty state renders during the initial loading window before the query resolves, causing a flash of "No photos yet".

A public reader already exists: `getOperatorPhotosPublic({ operatorId })` in `src/lib/operator-photos.functions.ts`, and the `operator_photos` table has a public SELECT policy, so no DB changes are needed.

## Changes

**1. `src/routes/charters.$location.$businessSlug.tsx`**
- After the listing resolves, fetch photos with `getOperatorPhotosPublic({ operatorId: op.id })` via `useQuery` (keyed on operator id).
- Pass `photos`, `photosLoading`, and `canManage={false}` to `<HeaderGallery />`.

**2. `src/components/operator-listing/HeaderGallery.tsx`**
- New props: `photos?: OperatorPhoto[]`, `photosLoading?: boolean`.
- When `photos` is provided, use it directly and skip the internal `listMyOperatorPhotos` query.
- When `canManage` is true and no `photos` prop is given (owner contexts: `_authenticated/operator.preview.tsx`, dashboard), keep current behavior using `listMyOperatorPhotos`.
- Loading UX:
  - While `photosLoading` (or the internal query is loading), render a skeleton placeholder grid (same dimensions as the photo grid, animated `bg-muted` tiles). Do **not** show the "No photos yet" empty state.
  - Only render the "No photos yet" empty state when loading has finished and `photos.length === 0`.
- Hide the owner-only "Upload Gallery Images" button in the empty state when `canManage` is false (public visitor just sees a neutral empty placeholder, or we hide the whole section — we'll keep a neutral empty state without the upload CTA).

**3. No changes** to `_authenticated/operator.preview.tsx` or `dashboard.my-listing.tsx` — they continue to work via the existing `listMyOperatorPhotos` path.

## Verification

- Visit a published charter URL while logged out → gallery shows the operator's photos (no flash of "No photos yet"; skeleton briefly, then images).
- Visit the same URL while logged in as a different user → same result.
- Owner preview / dashboard still shows the owner's photos and "Manage photos" controls.
