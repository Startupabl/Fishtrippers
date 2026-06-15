# FishTrippers Rebrand — Phase 1

## Scope
Pivot the site identity from Lemonaidely to **FishTrippers** (p2p fishing trips marketplace). Replace logo, header brand, hero section. Keep existing routes, business logic, and downstream sections untouched in this pass.

## 1. Logo (generate options)
Generate 2–3 logo concepts as transparent PNGs in `src/assets/`:
- **A.** Wordmark "FishTrippers" with stylized fish hook tail, navy blue + gold.
- **B.** Circular badge with fish silhouette + wordmark beside it (FishingBooker-style).
- **C.** Minimal modern mark: stylized fish forming an "F", wordmark beside.

After generation, present them and let you pick one. Rewrite `src/components/brand/Logo.tsx` to render the chosen mark (image + wordmark lockup) instead of the current tri-color text.

## 2. Brand tokens & color system
Update `src/lib/brand.ts` and `src/styles.css`:
- `BRAND.name` → "FishTrippers", `nameParts` → `Fish` / `Trippers`, new tagline → *"Book your next fishing trip."*
- New palette (blue + gold, harmonized with hero image):
  - `--ocean-deep` `#0A2540` (primary navy)
  - `--ocean` `#1E4D7B` (header bg / secondary)
  - `--sky` `#3B82F6` (links/accents)
  - `--gold` `#E8B547` (primary CTA)
  - `--gold-deep` `#C8941F` (CTA hover)
  - `--paper` `#FAFBFC` (surfaces)
- Map shadcn semantic tokens (`--primary`, `--accent`, `--ring`, button variants) to the new palette so existing buttons inherit blue/gold without per-component edits.

## 3. Hero image
Generate a wide cinematic photo for `src/assets/hero-fishing.jpg` — anglers on a boat holding a large fish, deep blue ocean, golden hour light (matches palette).

## 4. Site header
Edit `src/components/layout/SiteHeader.tsx`:
- New logo lockup on left.
- Right side: **List Your Trip** (gold pill button, replaces existing "List Your Boat"-equivalent CTA), then Log in / Sign up.
- Header background switches to translucent navy over the hero on the home route, solid white elsewhere.
- Remove/hide the "Search AI courses" bar (the hero owns search now).

## 5. Hero section (replaces current hero in `src/routes/index.tsx`)
Full-width hero using the new image with a navy gradient overlay:
- H1: **Book your next fishing trip**
- Sub: *Discover top-rated fishing charters and guides*
- Full booking bar (white card, rounded, drop shadow), 4 fields:
  1. Location — text input ("Fishing near me") with pin icon
  2. Date — shadcn date picker
  3. Guests — popover stepper for adults + children
  4. **Check availability** — gold CTA button
- Submitting routes to `/search` with the entered query (wire location → `?q=`; date/guests held in local state for now, ready for later filter integration).

## 6. Global name swap
Because `BRAND.name` / `BRAND.nameParts` / `BRAND.tagline` are the source of truth, the change propagates to: header logo, footer, auth pages, tab title fallback. Sweep `src/` for hardcoded "Lemonaidely" / "Aide" strings in the header, footer, root meta, and `index.tsx` hero copy; replace with FishTrippers equivalents. Leave deeper page copy (how-it-works, mentor pages, etc.) alone for a follow-up pass.

## Out of scope (next passes)
- Renaming routes like `/become-a-mentor`, `/become-an-aide` to fishing equivalents.
- Rewriting how-it-works / FAQ / mentor pages.
- Wiring date + guests into the search backend.

## Technical notes
- New colors defined as CSS vars in `src/styles.css` and exposed via `@theme inline` so Tailwind utilities (`bg-gold`, `text-ocean-deep`) work.
- Logo image imported via standard ES6 import (no `lovable-assets` externalization needed; assets are small).
- Hero booking bar is a new component `src/components/layout/HeroBookingBar.tsx` to keep `index.tsx` lean.
- Date picker uses existing shadcn `Calendar` in a `Popover` with `pointer-events-auto`.
