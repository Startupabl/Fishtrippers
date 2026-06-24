## Goal

Retire the legacy "class sessions / cohorts" concept entirely. It's a holdover from a prior version of the app and is unused by the live fishing-trip booking flow (which runs on `trip_packages` + `trip_date` + `host_availability`). DB confirms: 2 rows in `class_sessions`, 0 bookings reference them.

## Frontend code to remove

1. **`src/lib/cohorts.functions.ts`** — delete. Provides `listPublicCohorts` and `bookSeat`. Nothing in the live trip-booking flow uses them.
2. **`src/components/schedule/RescheduleProposalsSection.tsx`** — delete. Cohort reschedule UI; not part of trip booking.
3. **Listing detail page (`src/routes/c.$categorySlug.$listingSlug.tsx`)** — remove the "Cohorts" / class-session list, the `handleBook` cohort call, the expanded-cohort state, and the `bookSeat` import. Keep the trip-package booking UI intact.
4. **Learner schedule (`src/routes/_authenticated/dashboard.learner.schedule.tsx`)** — drop the `cohortQueries` block and any cohort merging into `rows`. Keep the existing per-booking schedule.
5. **`src/components/orders/OrderSchedulePanel.tsx`** — drop the `getClassSessionForOrder` query and `cohort?.listing_title` fallback; rely on the order snapshot fields already used.
6. **`src/lib/bookings.functions.ts`** — remove `getClassSessionForOrder`, `startClassSession`, `endClassSession`, and any helpers that read/write `class_sessions`.
7. **`src/lib/schedule.functions.ts`** — remove anything that selects from `class_sessions` (keep trip / availability logic).
8. **`src/lib/admin-availability.functions.ts`** — drop the `class_sessions` lookup; keep the bookings/host_availability surface.
9. **`src/lib/orders.functions.ts`** — stop selecting `class_session_id` on bookings and drop the cohort enrichment block.
10. **`src/routes/api/public/stripe/webhook.ts`** — remove the `increment_class_session_seats` call path and stop selecting `class_session_id`. Stripe confirmation still updates the booking; the seat-increment RPC is no longer relevant since trips track seats on `bookings.guests`.

## Server function callers / minor cleanups

- Remove the contact-form "Virtual Classroom Tech Issue" topic in `src/components/contact/ContactSupportForm.tsx` and the matching label in `src/routes/_admin/admin.queue.tsx`. They reference a feature we no longer have.
- Remove the now-unused `_authenticated/classroom` directory references and any imports of deleted modules.

## Database migration (single migration file)

After the code stops touching `class_sessions`, ship one migration that:

1. `ALTER TABLE public.bookings DROP COLUMN class_session_id;`
2. `DROP FUNCTION public.increment_class_session_seats(uuid);`
3. `DROP TABLE public.class_sessions;`
4. `DROP TYPE public.class_session_status_t;`

No data loss: 2 unused rows in `class_sessions`, 0 booking references.

The auto-regenerated `src/integrations/supabase/types.ts` will drop the `class_sessions`, `class_session_status_t`, `bookings.class_session_id`, and `increment_class_session_seats` definitions.

## What stays untouched (intentionally)

- `trip_packages`, `vessels`, `boat_types`, `operators`, `host_availability`, `bookings` (minus the dropped column), `orders`, the Stripe trip-booking flow, schedule UI for trips, host availability calendar — all the live fishing-trip functionality.
- Reviews, certificates, messaging, support tickets, admin queue (minus the one removed topic).

## Verification

1. Typecheck passes after the deletions (no dangling imports of `bookSeat`, `getClassSessionForOrder`, `startClassSession`, `endClassSession`, `increment_class_session_seats`, or `class_sessions` types).
2. Trip booking end-to-end still works against the preview: listing → checkout → Stripe webhook → confirmed booking → schedule row.
3. Database linter clean after the migration.
4. Re-run security scan to confirm no new RLS warnings on the leftover tables.