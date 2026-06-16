## Goal

Make the admin/listings thumbnail (column 2) reflect the operator's selected Cover Photo, use the same image on public search cards, and let the operator switch the main photo at any time.

## Current state (already wired)

- `operator_photos.is_cover` + the `sync_operator_cover` trigger mirror the chosen cover into `operators.cover_image_url` (falls back to the first photo when nothing is starred).
- `admin/listings` column 2 already renders `row.cover_image_url` as the 40×40 thumbnail next to the date tooltip — so once the trigger fires, the admin row updates on the next fetch.
- `GalleryManager` already exposes a star button per photo that calls `setOperatorCoverPhoto`, plus delete and reorder.

So the data path is in place. This plan closes the remaining UX/wiring gaps.

## Changes

1. **Admin thumbnail freshness**
   - In `src/routes/_admin/admin.listings.tsx`, invalidate the admin listings query after a cover change is broadcast (listen on the `operator-photos-mine` query key or just refetch on focus — current setup already refetches on focus, so only add a small "Cover" hint tooltip on the thumbnail: `Cover photo — set in Gallery`).
   - Add an empty-state placeholder copy "No cover yet" so admins can spot listings missing a hero image.

2. **GalleryManager clarity**
   - Show a visible "Cover" pill on the starred photo (in addition to the star icon) so operators clearly see which photo is the main one.
   - Add a small helper line at the top of the dialog: "The Cover Photo is shown on search results and in the admin dashboard. Click the star on any photo to make it the main image."
   - Confirm the first uploaded photo auto-becomes cover (already handled by trigger fallback) and surface that via toast on first upload: "Set as your Cover Photo — you can change this anytime."

3. **Search card wiring**
   - The public search page (`src/routes/search.tsx`) currently lists journeys. When the operator search/result card is built, it must read `operators.cover_image_url` (the same field that drives the admin thumbnail) and render the 4:3 thumbnail rendition.
   - For now: add a small `getOperatorCardImage(operator)` helper in `src/lib/operators.functions.ts` that returns `cover_image_url` (which already points at the 1200×900 `thumb_url` written by the upload pipeline), so any future operator card uses one source of truth.

4. **Cache invalidation**
   - In `GalleryManager`, after `setOperatorCoverPhoto` / `deleteOperatorPhoto` / `addOperatorPhoto`, also invalidate the `["admin-listings"]` and `["my-listing"]` query keys so the admin table and the owner's dashboard refresh without a manual reload.

## Out of scope

- Building the operator search results page (journeys-vs-operators search is a separate task).
- Re-encoding or resizing existing cover images — pipeline already emits the 4:3 thumb.
- Editing image-pipeline output shapes.

## Files touched

- `src/routes/_admin/admin.listings.tsx` — tooltip + empty-state copy on thumbnail.
- `src/components/operator-listing/GalleryManager.tsx` — "Cover" pill, helper text, broader cache invalidation, first-upload toast.
- `src/lib/operators.functions.ts` — add `getOperatorCardImage` helper (used by future search card).
