## Goal

Make the Create/Edit Listing wizard (all 6 steps + the Trip editor dialog) fully usable on phones (320–414 px) with zero horizontal scroll.

## Diagnosis

Walked the wizard shell, each step file, and the Trip editor. The shell itself does not overflow (probed at 371 px, body = 371 px, no offending children) — but the experience still feels cut off because:

1. There is no site-wide guard against accidental horizontal scroll. Any future overflowing element silently breaks the whole page.
2. Several inner blocks ignore mobile sizing: 2-column grids that don’t collapse, `max-w-md` selects, dialog content that constrains an inner column to `sm:max-w-[50%]` mid-section.
3. The Trip editor `DialogContent` (`w-[calc(100vw-1rem)] max-w-2xl`) renders fine, but the form rows inside still use `grid grid-cols-2` in places that should stack on mobile.
4. Boat-type `<SelectTrigger>` shows an image + long label without a `min-w-0 truncate` guard — overflows narrow viewports when a long subcategory is chosen.

## Scope (frontend only)

### 1. Global overflow guard
`src/styles.css` — add:
```css
html, body { overflow-x: hidden; max-width: 100%; }
```

### 2. Wizard shell — `src/routes/create-listing.new.tsx`
- Outer wrapper: add `overflow-x-hidden`.
- Confirm grid children carry `min-w-0` (sidebar aside is `hidden lg:block`, main already has `min-w-0`).
- Sticky mobile stepper: keep `overflow-x-auto` but constrain to viewport width.

### 3. Step components — collapse 2-col grids on mobile and prevent fixed widths
- `ProfileStep.tsx`: avatar row → wrap on phones (`flex flex-wrap`), label/button stack vertically <sm.
- `BoatDetailsStep.tsx`:
  - Boat-type `<SelectTrigger>` — remove `max-w-md`, add `min-w-0` + `truncate` on inner label; image `shrink-0`.
  - The "Restored" checkbox cell in the engine grid → `sm:col-span-1`, full width on mobile.
- `FishingFocusStep.tsx`: environment grid is already `sm:grid-cols-2`; ensure inner card `min-w-0` so descriptions wrap.
- `BookingRulesStep.tsx`: cancellation cards `md:grid-cols-3` → already collapses; ensure `min-w-0` on each card so policy bullets wrap.
- `TripCatalogStep.tsx`: templates grid `sm:grid-cols-3` — already responsive; row item already responsive.
- `BusinessTypeStep.tsx`: spot-check, add `min-w-0` if needed.

### 4. Trip editor — `src/components/operator-onboarding/trips/TripFormDialog.tsx`
- Replace any `grid grid-cols-2` with `grid grid-cols-1 sm:grid-cols-2` (timing, pricing, party-size rows).
- Line 612 — remove `sm:max-w-[50%]`; let column flex naturally.
- Ensure inputs use `w-full` (Tailwind UI Input already does, but verify wrappers don’t set fixed widths).
- Selected-chip rows (species/environments/techniques) — add `flex flex-wrap min-w-0`.

### 5. Verification
- Re-probe via preview JS at 375 px after the build: `documentScrollWidth === clientWidth`, no element with `right > vw`.
- Smoke-screenshot each step with Playwright headless at 375×812 (wizard + Trip dialog open).

## Out of scope
Business logic, server functions, schema, and copy stay untouched. The Trip dialog data flow is not altered — only its layout classes.
