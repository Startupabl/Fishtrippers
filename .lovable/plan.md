## Plan

Replace the hero background and the wordmark logo with the two uploaded files.

### Steps

1. **Hero image** — upload `openart-...upscaled.jpg` to Lovable Assets as `hero-fishing.jpg` and write the pointer to `src/assets/hero-fishing.jpg.asset.json`. Update `src/routes/index.tsx` to import the pointer and use `asset.url` instead of the current bundled JPG. Delete the old `src/assets/hero-fishing.jpg`.

2. **Logo** — upload `openart-dda7db71...png` to Lovable Assets as `fishtrippers-logo.png` and write the pointer to `src/assets/fishtrippers-logo.png.asset.json`. Update `src/components/brand/Logo.tsx` so when `showMark={false}` is **not** set, it renders this PNG (full lockup: mascot + wordmark) via `<img>` instead of the current SVG mark + text. When `showMark={false}` (used by the transparent home header), keep the current white text-only wordmark — the uploaded logo has a dark mascot that won't read over the hero.

3. Delete the old `src/assets/fishtrippers-logo.png` if present.

### Out of scope
- No layout, header, or hero-height changes.
- Home header stays text-only white wordmark (mascot logo is used on inner pages / footer where background is light).
