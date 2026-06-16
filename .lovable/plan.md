## Goals

1. The wizard should end at step 6 (Booking rules). "Continue" from Booking rules sends the user to `/operator/preview`, which becomes the actual final step.
2. The preview page is where the operator uploads gallery images, then submits for admin approval. Submitting triggers the existing Connect-payouts (Stripe) dialog.
3. Fix the About text on the preview overflowing its container — it must wrap inside the box.

## Changes

### 1. Remove the "Review & submit" step from the wizard

`src/stores/useOperatorOnboardingStore.ts`
- Drop `"review"` from the `StepId` union.

`src/routes/mentor.create-path.tsx`
- Remove `"review"` from `STEP_ORDER`, the `steps` sidebar array, and the `state.currentStep === "review"` render branch.
- Remove `ReviewSubmitStep` import.
- In `advance()`, when the current step is `booking_rules` (the new last step): persist the draft as today, then `navigate({ to: "/operator/preview" })` instead of moving to a next step.
- If `state.currentStep === "review"` is restored from a persisted draft, coerce it to `"booking_rules"` on hydrate so old sessions don't land on a dead step.

`src/components/operator-onboarding/steps/ReviewSubmitStep.tsx`
- Delete the file (no longer referenced).

Sidebar will now show 6 steps total (5 for guides, since `boat_details` is skipped).

### 2. Turn /operator/preview into the submit + payouts page

`src/routes/_authenticated/operator.preview.tsx`
- Add a "Submit for approval" CTA. Show it when `op.moderation_status` is `draft` or `rejected`. Hide (or replace with "Pending review" / "Approved" text) for other statuses.
- Disable the button until `isReadyToSubmit(state)` passes against the hydrated onboarding store (hydrate the store from the same `getMyOperator` payload the wizard already uses, so validation is consistent).
- On submit: call the existing `submitOperatorForReview` server fn with the same payload shape `ReviewSubmitStep` used (move that payload-building into a small helper in `src/lib/operators.shared.ts` or inline). On success: toast, invalidate `operator-listing-preview`, open `ConnectPayoutsDialog`. Closing the dialog stays on `/operator/preview`.
- Placement: put the CTA in `PreviewBanner` (replace/augment the current "Edit Listing" button with a primary "Submit for approval" action) so it sits at the top, and also at the bottom of the page for reachability after scrolling.

`src/components/operator-listing/PreviewBanner.tsx`
- Accept an optional `onSubmit`, `canSubmit`, `submitting`, and `showSubmit` prop set; render the submit button next to "Edit Listing".

The gallery upload affordance already exists in `HeaderGallery` (the "Upload Gallery Images" button). No new gallery work is in scope here unless wired separately.

### 3. Fix About text overflow on the preview

`src/components/operator-listing/AboutBlock.tsx`
- Add `break-words` (and `overflow-wrap-anywhere` via `[overflow-wrap:anywhere]`) to the `<p>` so long unbroken strings/URLs wrap inside the column.

`src/routes/_authenticated/operator.preview.tsx`
- Add `min-w-0` to the left grid column wrapper (`<div className="space-y-8">`) so the `1fr` track in `lg:grid-cols-[1fr_320px]` doesn't expand to fit oversized inline content. This is the underlying cause of the text spilling past the box.

## Out of scope

- Gallery upload backend/storage. The button is already present in `HeaderGallery`; wiring it to real uploads is a separate task.
- Any change to admin moderation review UI.
