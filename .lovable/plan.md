# Mobile responsiveness fixes — Create / Edit Listing wizard

Goal: make every step of the operator onboarding wizard (and the trip editor modal it opens) fully usable at 320–414px widths without horizontal scrolling, cropped buttons, or cramped two-column inputs.

## Files to edit

### 1. `src/routes/create-listing.new.tsx` (wizard shell)
- Reduce outer horizontal padding on phones: `px-4` → `px-3 sm:px-4` on the header, banner, and grid container.
- Header label: shrink `text-sm` → `text-xs sm:text-sm` and add `truncate` + `gap-2` so "Edit your listing" never pushes the logo off-screen.
- Card padding: `p-6 sm:p-8` → `p-4 sm:p-6 md:p-8` so form fields get more usable width on phones.
- Mobile step chips: make the chip row **sticky** at the top of the viewport on `<lg`, with `bg-background/95 backdrop-blur` and a bottom border, so users can always jump between steps without scrolling back up.

### 2. `src/components/operator-onboarding/trips/TripFormDialog.tsx` (biggest issue)
- `DialogContent`: change `max-w-2xl max-h-[90vh] overflow-y-auto` to `w-[calc(100vw-1rem)] max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6` — gives 8px breathing room on phones and trims inner padding.
- Trip-details grid (Start time + Duration): `grid grid-cols-2 gap-3` → `grid grid-cols-1 sm:grid-cols-2 gap-3`.
- Pricing grid (Price + Seats/Max party): `grid grid-cols-2 gap-3` → `grid grid-cols-1 sm:grid-cols-2 gap-3`.
- Min trip size container: `max-w-[50%]` → `max-w-full sm:max-w-[50%]`.
- DialogFooter buttons: add `w-full sm:w-auto` on Cancel + Save and `gap-2` so they stack cleanly on mobile.

### 3. Step components — `src/components/operator-onboarding/steps/*.tsx`
Apply the same two small tweaks to each step so the inside of the card matches the new outer padding:
- Each step's `<h1 className="text-3xl ...">` → `text-2xl sm:text-3xl` (fits one line on phones).
- Inner section cards `rounded-2xl border bg-card p-6` → `p-4 sm:p-6`.

Files touched:
- `ProfileStep.tsx` — about/profile cards.
- `BoatDetailsStep.tsx` — boat info / engine / capacity / features sections (4 cards).
- `FishingFocusStep.tsx` — environments + species cards.
- `BookingRulesStep.tsx` — advance notice + cancellation + weather sections.
- `TripCatalogStep.tsx` — header sizing only; existing list/grid is already responsive.
- `BusinessTypeStep.tsx` — header sizing only.

### 4. `src/components/operator-listing/PreviewBanner.tsx` (used on the final preview/edit screen)
- Wrap the action buttons (`Edit Listing`, `Submit for approval`) so they wrap to a new row on small viewports — already uses `flex-wrap`, but the truncating message can crowd them. Add `w-full sm:w-auto` to each Button and `justify-end` to the action group so they sit on their own row on mobile.

### 5. `src/routes/_authenticated/operator.preview.tsx` (edit-mode review screen)
- `px-4` on `<main>` is fine; no changes needed besides what `PreviewBanner` gets above.

## Out of scope (intentionally)
- Desktop layout, server logic, schema, or RBAC — unchanged.
- The public listing view (`/charters/$location/$businessSlug`) — already adjusted in earlier turns.
- The Dashboard "My listing" hub — separate request if needed.

After approval I'll batch all edits in parallel.
