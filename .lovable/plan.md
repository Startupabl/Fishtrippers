Three focused changes, all front-end. No DB or server-fn changes required.

## 1. Home page — Categories on one line with scroll arrows

File: `src/routes/index.tsx` (`CategoryGrid`)

- Replace the 2/3/6-column `<ul className="grid ...">` with a horizontal scroll strip:
  - Outer wrapper: `relative` container with a `ref` on the scroller.
  - Scroller: `flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [-ms-overflow-style:none]` + `::-webkit-scrollbar` hidden via a small inline style or utility class.
  - Each card becomes a fixed-width `li` (`w-[180px] md:w-[200px] shrink-0 snap-start`) keeping the existing aspect-square card markup so the design stays identical.
- Add left/right circular arrow buttons (lucide `ChevronLeft` / `ChevronRight`) absolutely positioned (`left-2` / `right-2`, `top-1/2 -translate-y-1/2`), rounded-full white background, border, subtle shadow. Each `onClick` scrolls the scroller by `~scrollerRef.current.clientWidth * 0.8` in the matching direction.
- Hide arrows when content doesn't overflow (track via a `useEffect` measuring `scrollWidth > clientWidth`). Hide each arrow individually when at the start/end based on `scrollLeft` (listener on `scroll`). Keyboard + focus rings preserved on the arrow buttons.

No data changes; same `listFeaturedCategories` query.

## 2. Edit listing — reuse the wizard with edit-mode semantics

Goal: the pencil / "Edit listing" buttons on the dashboard open the existing create wizard pre-populated, with no green onboarding banner, and the final step says "Save updates" instead of submitting for review.

### Routing/entry

File: `src/routes/_authenticated/dashboard.my-listing.tsx`

- All three places linking to `/mentor/create-path` (header button, table row pencil, dropdown "Edit listing") become `<Link to="/mentor/create-path" search={{ edit: true }}>`. The header button label stays "Edit listing".

### Wizard route

File: `src/routes/mentor.create-path.tsx`

- Extend `validateSearch` to accept `edit: z.boolean().optional()`. Read via `Route.useSearch()`.
- `const isEditMode = !!search.edit && hasListing;`
- Skip the "redirect to dashboard if hasListing" effect when `isEditMode` is true — operators with an existing listing must be able to walk back through the steps to change them.
- Hide the green ⚓ banner whenever `isEditMode` is true (already hidden by `!hasListing`, this just makes intent explicit and survives the redirect change).
- In the header, swap the "List your trip" label for "Edit your listing" when in edit mode.
- When the final step's `advance()` fires, still navigate to `/operator/preview`, but pass `?edit=true` so the preview page knows it's in edit mode: `navigate({ to: "/operator/preview", search: { edit: true } as any })`.

### Preview / final-save screen

File: `src/routes/_authenticated/operator.preview.tsx`

- Add `validateSearch` to read optional `edit: boolean` (currently there is none — add one).
- `const isEditMode = !!search.edit && status === "approved" /* or any non-draft */ ;` In practice: treat the page as edit-mode whenever the operator's `status`/`moderation_status` indicates the listing already passed review, OR whenever `?edit=true` is set explicitly.
- In edit mode:
  - Hide the bottom "Ready to go live? … Submit for approval" block.
  - Render a "Save updates" block in its place (same card shell) with a single primary button "Save updates".
  - "Save updates" handler: call `upsertOperatorDraft` with the same operator+vessel payload currently used in `persistCurrentStep` (extract a tiny helper or inline it here). On success: `toast.success("Listing updated")`, invalidate `["operator-listing-preview"]` and `["my-operator"]`, then `navigate({ to: "/dashboard/my-listing" })`. No re-submission for admin review.
  - The `PreviewBanner` props stay the same but we pass `canSubmit={false}` so its primary CTA is suppressed in edit mode (verify the component already supports hiding; if not, add a `mode="edit"` prop to render a "You're editing your live listing" label instead of the submit CTA).

Result: the green onboarding banner never shows in edit mode, the wizard is fully reusable for edits, and the final action is a non-review save.

## 3. Add the 2 new categories to the wizard with icons

The admin added two top-level categories that aren't yet in the wizard's hardcoded `FISHING_ENVIRONMENTS` list: **Shore / Shoreline** and **Walk & Wade**.

File: `src/lib/operators.shared.ts`

- Import two more lucide icons. Suggested mapping:
  - `Shore / Shoreline` → `Anchor`
  - `Walk & Wade` → `Footprints`
- Append two entries to `FISHING_ENVIRONMENTS`:
  ```ts
  { id: "shore_shoreline", label: "Shore / Shoreline",
    description: "Fishing from beaches, jetties, piers and rocky shorelines.",
    icon: Anchor },
  { id: "walk_wade", label: "Walk & Wade",
    description: "Wading creeks, flats and shallow waters on foot.",
    icon: Footprints },
  ```
- Extend `ENV_TO_PRIMARY` so the new ids map to a valid `PrimaryCategory` (both → `"inshore"` to keep the existing trip-template logic working).

No other changes required — `FishingFocusStep.tsx` already renders the full list as 2-column cards with icons, so the two new entries pick up the same card design automatically.

## Out of scope

- No new server functions, migrations, or schema changes.
- No changes to `useHasActiveListing`, `SiteHeader`, or the create-flow stepper components.
- Trip-catalog edit dialog is unchanged.
