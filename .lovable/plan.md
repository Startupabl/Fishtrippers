## Plan

Revert headers to the original text-only wordmark and make the entire wordmark gold.

### Steps

1. **`src/components/brand/Logo.tsx`** — remove the PNG-lockup branch added last turn. `Lockup` returns the text wordmark in all cases. Change the trailing nameParts color from `wordColor` (white/ocean-deep) to the gold accent so the whole word renders in gold. The `tone` prop still controls the tagline color; the wordmark itself is always gold.
2. **Delete the unused PNG asset** — remove `src/assets/fishtrippers-logo.png.asset.json` (and its CDN copy via `delete_asset`) plus the now-unused `logoMark` / `logoAsset` import. Hero image stays as-is.
3. No header/footer call-site changes needed — `showMark` becomes a no-op visually, but kept in the prop signature to avoid breaking imports.

### Out of scope
- Hero image, header layout, fonts, sizing.
