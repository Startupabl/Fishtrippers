# Overlay Header on Hero + White Logo Text

## 1. Logo (`src/components/brand/Logo.tsx`)
Add a `showMark?: boolean` prop (default `true`). When `false`, omit the circular fish icon and render only the wordmark. Keep the existing `tone="light"` path so the wordmark renders white over the hero.

Decision for the home header: render `<Logo showMark={false} tone="light" />` — text-only "FishTrippers" in white, with "Fish" still gold for brand accent. If you prefer fully solid white text (no gold), say the word and I'll drop the two-tone.

## 2. SiteHeader (`src/components/layout/SiteHeader.tsx`)
Detect `isHome` from the current pathname. When on `/`:
- Wrapper becomes `absolute top-0 left-0 right-0 z-20` (over the hero), background transparent, no border.
- Logo uses `tone="light"` and `showMark={false}`.
- "Log in" / "Sign up" text turns white (`text-white hover:text-white/80`).
- "List Your Trip" stays gold (already legible on dark).

Everywhere else (non-home routes) the header keeps today's sticky white background.

## 3. Hero (`src/routes/index.tsx`)
- Drop the top padding that previously made room for the sticky header — now the hero starts at viewport top with the header floating on top of it.
- Push the headline/sub/booking bar down a bit so they sit below the floating header (e.g. `pt-28 md:pt-32`).
- Headline + sub already white and left-aligned; no copy changes.

## Out of scope
Hero height change (separate request you haven't approved yet).
