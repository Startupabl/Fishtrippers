
# List Your Trip — New Onboarding (Charter / Guide)

Replace the existing `/mentor/create-path` flow with a captain-onboarding workflow modeled on fishtrippers.com. New schema, new UI, new sidebar stepper. Existing `journeys` flow stays untouched so current listings/checkout keep working; the new flow writes to new tables.

## User-facing flow

Left sidebar stepper (fixed, vertical) with status pills: completed (green check), active (ring), upcoming (muted). Steps clickable out of order once unlocked.

1. **Business Type** — Charter (has a boat) vs Independent Guide (shore/wade/kayak). Choice gates step 3.
2. **Profile** — Business / Display Name, Location (base of operations).
3. **Path-specific**
   - **Charter:** Boat make, model, year, length, engine type/size, **Max Passenger Capacity (required number)**, plus a checkbox grid of features grouped as Navigation/Electronics, Amenities, Fishing Gear.
   - **Guide:** Step auto-marked complete and skipped (still visible in sidebar as "N/A").
4. **Booking Rules**
   - Booking type toggle: Instant Book vs Inquiry Only.
   - Advance notice dropdown: 6h / 12h / 24h / 48h.
   - Cancellation policy: 3 comparison cards (Flexible / Moderate / Strict) with full terms; one is selected.
   - Static weather policy disclaimer (always-100%-refund-on-captain-cancel).
5. **Review & Submit** — Summary of all entered data. Submit creates the listing in `pending` moderation, redirects to a "Listing submitted" screen explaining: appears as "Contact to Book" directory entry, media + crew unlock after admin approves.

Sidebar is `Sidebar` from shadcn with `collapsible="icon"`. Mobile: collapses to a top sheet trigger.

## Data model (new tables)

Single migration creates three tables, all with GRANTs + RLS scoped to `auth.uid()`. Reuses existing `journey_moderation_status` enum for the operator listing status so the existing admin moderation UI/queue continues to work without changes.

- `operators` — one row per signed-up captain
  - `owner_id` (auth.users), `business_type` ('charter' | 'guide'), `display_name`, `location`, `booking_type` ('instant' | 'inquiry'), `advance_notice_hours` (6/12/24/48), `cancellation_policy` ('flexible' | 'moderate' | 'strict'), `moderation_status` (reuses `journey_moderation_status`), `submitted_at`, `created_at`, `updated_at`.
- `vessels` — 0..1 per operator (1 if charter, 0 if guide)
  - `operator_id`, `manufacturer`, `model`, `year`, `length_ft`, `engine_type`, `engine_size`, `max_passenger_capacity` (required, >=1), `features` JSONB (array of slugs from a fixed catalog), `created_at`, `updated_at`.
- `trip_packages` — empty at onboarding; created later via dashboard "Trip Builder". Included now so calendar/booking foreign keys are in place.
  - `operator_id`, `vessel_id` (nullable for guide), `title`, `duration_minutes`, `price_minor`, `currency`, `status` (draft|active), timestamps.

Validation triggers (not CHECK) for any time-dependent rules. `updated_at` trigger on all three.

Booking-window enforcement, calendar ownership at the operator/vessel level, and the "one boat busy" dynamic blocking are scoped out of this turn (no trips exist at submit time) but the schema supports them.

## Code changes

New files:
- `src/routes/mentor.create-path.tsx` — **rewritten** to render the new stepper shell + step components. Old logic deleted.
- `src/components/operator-onboarding/OnboardingSidebar.tsx` — sidebar stepper with status states.
- `src/components/operator-onboarding/steps/BusinessTypeStep.tsx`
- `src/components/operator-onboarding/steps/ProfileStep.tsx`
- `src/components/operator-onboarding/steps/BoatDetailsStep.tsx` (includes features grid + capacity)
- `src/components/operator-onboarding/steps/BookingRulesStep.tsx` (booking toggle, advance notice, policy cards, weather disclaimer)
- `src/components/operator-onboarding/steps/ReviewSubmitStep.tsx`
- `src/components/operator-onboarding/SubmittedScreen.tsx` — post-submit confirmation.
- `src/stores/useOperatorOnboardingStore.ts` — zustand draft (persisted to localStorage) so refresh doesn't lose progress.
- `src/lib/operators.functions.ts` — `createServerFn`s: `getMyOperatorDraft`, `upsertOperatorDraft`, `submitOperatorForReview`. Use `requireSupabaseAuth`.
- `src/lib/operators.shared.ts` — zod schemas + feature catalog constants (single source of truth for UI + server).

Untouched:
- Old `mentor-express/*` components, `journeys.*`, mentor profile flow — left alone so existing journey listings keep working.
- Existing `become-a-mentor` marketing page (entry CTA still points to `/mentor/create-path`).

## Copy / terminology

UI copy in the new flow uses operator / captain / charter / trip. Existing pages stay on current terminology — no global rename.

## Validation & verification after build

- Sign in → `/mentor/create-path` → walk Charter path end-to-end → confirm operator + vessel rows inserted, `moderation_status = 'pending'`.
- Repeat for Guide path → confirm operator row only, no vessel.
- Reload mid-flow → draft restores from server (server fn) with localStorage fallback.
- Sidebar: click between unlocked steps; charter→guide switch clears boat data; submit disabled until required fields valid.

## Out of scope (explicitly deferred)

- Trip Builder UI, calendar/availability UI, photo/video uploads, crew management — unlock after admin approval, future turns.
- Admin approval UI changes — existing moderation queue works because we reuse `journey_moderation_status`. If admins need a separate "operators awaiting review" list, that's a follow-up.
- Migrating existing journeys/users to the new operator model.
