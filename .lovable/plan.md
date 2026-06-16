## Goal
Ensure all 30 boat-type silhouette icons face the **same direction (right)** so the dropdown, listing cards, and future search cards look consistent — not sloppy.

## Approach
Rather than regenerating icons (which risks style drift and would require re-uploading + re-mapping URLs in the DB), simply **horizontally flip** the icons that currently face left. This preserves the exact silhouette style we already approved and keeps `boat_types.icon_url` rows unchanged.

## Steps
1. **Audit** — produce a fresh montage of all 30 icons and confirm which face left. From the current check, these face left and need flipping:
   - `catamaran.png`
   - `cuddy-cabin.png`
   - `downeast.png`
   - `headboat.png`
   - `sports-fishing.png`
   - Re-verify ambiguous ones (`cruiser`, `convertible`) up close and include if needed.

2. **Flip in place** using ImageMagick (`magick <file> -flop <file>`) on each mis-aligned PNG in `src/assets/boat-icons/`. Transparency is preserved.

3. **Re-upload to CDN** — each PNG was externalized via `lovable-assets`, so flipped files need to be re-uploaded and the corresponding `.asset.json` pointer overwritten (the `boat_types.icon_url` DB column references the asset URL, which contains the asset UUID — so a new asset ID will be issued and we'll patch the DB rows for just the flipped icons).

   Alternative (simpler): if the icons in the dropdown are imported as static module assets from `src/assets/boat-icons/*.png` rather than via CDN URLs, we skip the upload step entirely — the flipped file is picked up on next build. I'll confirm which path is used in `BoatDetailsStep.tsx` before executing.

4. **Verify** — regenerate the montage post-flip; all 30 should face right. Spot-check the dropdown in the live preview.

## Out of scope
- No regeneration of icons.
- No DB schema changes.
- No changes to dropdown sizing (already settled at `h-7 w-12`).
