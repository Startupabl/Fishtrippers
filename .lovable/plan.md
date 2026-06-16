# Listing Gallery & Media System

A modular gallery for the operator listing: hard-capped uploads, client-side WebP optimization, a 5-image grid with full-screen lightbox, and cover-photo logic that feeds the search card thumbnail.

## 1. Data model

New table `public.operator_photos`:

- `id uuid pk`
- `operator_id uuid fk -> operators(id) on delete cascade`
- `position int` (sort order, 0-based)
- `is_cover boolean default false`
- `storage_path text` (folder in `listing-portfolio` bucket)
- `hero_url text` (1920w WebP)
- `gallery_url text` (800w WebP)
- `thumb_url text` (1200x900 WebP, 4:3 — search card)
- `width int`, `height int`, `bytes int`
- `created_at timestamptz default now()`

Constraints / triggers:
- Partial unique index: only one `is_cover = true` per operator.
- Trigger: enforce ≤ 15 photos per operator on INSERT.
- Trigger: when a photo is inserted/updated/deleted, recompute cover (default first by position if none flagged) and mirror its `thumb_url` into `operators.cover_image_url` so search cards stay in sync.

RLS:
- SELECT: anyone (public listings) — table reads are for the public listing page.
- INSERT/UPDATE/DELETE: owner of the parent operator only.
- Public read on the `listing-portfolio` bucket already exists.

## 2. Upload & optimization pipeline (client-side)

All processing happens in the browser before upload — Cloudflare Workers can't run `sharp`, and doing it client-side keeps bandwidth and storage low.

- New util `src/lib/image-pipeline.ts` using Canvas + `canvas.toBlob('image/webp', 0.82)`:
  - Reject files > 5 MB or non-image MIME up front.
  - Decode once via `createImageBitmap`.
  - Produce three WebP renditions per photo: `hero` (max 1920w), `gallery` (max 800w), `thumb` (1200×900, cover-cropped 4:3). Preserve aspect ratio for hero/gallery.
- Uploads stream to `listing-portfolio/{operator_id}/{photo_uuid}/{hero|gallery|thumb}.webp` via the browser Supabase client (owner is authenticated → respects RLS / storage policies).
- After all three blobs succeed, a `createServerFn` (`addOperatorPhoto`) inserts the DB row with public URLs + dimensions.
- Per-file progress (0–100%) is tracked in component state and rendered in the dropzone list.

## 3. Management UI (owner)

New `src/components/operator-listing/GalleryManager.tsx`, surfaced from the existing "Upload Gallery Images" CTA in `HeaderGallery` (opens a dialog/sheet):

- Drag-and-drop zone (`react-dropzone` already common in shadcn ecosystem — add if missing) with click-to-browse fallback.
- File list with per-file progress bar, filename, size, and inline error states (oversize / wrong type / over-cap).
- Existing photo grid with:
  - Star icon to set cover (highlights current cover).
  - Trash icon to delete (confirm).
  - Drag handles to reorder (persists `position`).
- Counter: "X / 15 photos". Upload button disabled past cap.

Server functions in `src/lib/operator-photos.functions.ts` (auth-gated via `requireSupabaseAuth`, ownership-checked):
- `listMyOperatorPhotos`
- `addOperatorPhoto({ storage_path, hero_url, gallery_url, thumb_url, width, height, bytes })`
- `deleteOperatorPhoto({ id })` — also removes objects from storage.
- `setCoverPhoto({ id })`
- `reorderOperatorPhotos({ ids: string[] })`

## 4. Viewing experience

Refactor `HeaderGallery.tsx`:

- When photos exist: responsive 5-up grid (1 large left, 4 small right on ≥ sm), each `<img loading="lazy" decoding="async">` using the `gallery_url` rendition; the hero tile uses `hero_url`.
- "Show all photos" button overlaid on the last tile → opens `LightboxModal`.
- Empty state: keep current placeholder card + "Upload Gallery Images" CTA (now wired to open `GalleryManager`).

New `src/components/operator-listing/LightboxModal.tsx`:

- Full-screen `Dialog` rendering `hero_url` images.
- Prev / Next / Close controls, arrow-key + swipe (touch) navigation, image counter ("3 / 12").
- Preloads neighboring images for snappy nav.

## 5. Public listing card integration

- The existing `operators.cover_image_url` field (already used by search cards) is now driven by the cover-photo trigger above — no search-page changes required beyond confirming the card consumes `cover_image_url`.
- Defaulting: first uploaded photo becomes cover automatically; explicit star overrides.

## Technical notes

- Canvas-based WebP encode keeps the pipeline serverless-safe; quality 0.82 hits a good size/visual trade-off.
- Three renditions per photo: ~ (1920w ~250KB) + (800w ~80KB) + (1200×900 ~120KB). 15 photos worst-case ≈ 7 MB total per listing.
- Lazy loading via native `loading="lazy"`; lightbox images preload only ±1 neighbor.
- `react-dropzone` adds ~12KB gz; acceptable. Alternative: hand-rolled drop handler if avoiding deps.
- Storage path is scoped by `operator_id`; storage RLS policy must already allow the owner to write under that prefix (verify and add migration if not).
- A separate cleanup edge function is **not** needed — `deleteOperatorPhoto` removes blobs synchronously.

## Out of scope

- Server-side re-encoding / CDN transforms.
- Video uploads.
- AI-generated alt text (can be a later pass).
