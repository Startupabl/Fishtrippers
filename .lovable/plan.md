# Fix Custom Trip submission + Admin terminology

## 1. Bug fix — "host_availability_status_check" violation

The `sync_host_availability_from_booking` trigger now writes a `'held'` row when a booking is in `pending_offer`, but the `host_availability.status` CHECK constraint still only allows `'booked'` and `'blocked'`. Sending a Custom Trip therefore fails immediately.

**Migration:** drop and recreate the check to allow `'booked' | 'blocked' | 'held'`.

```sql
ALTER TABLE public.host_availability DROP CONSTRAINT host_availability_status_check;
ALTER TABLE public.host_availability
  ADD CONSTRAINT host_availability_status_check
  CHECK (status IN ('booked','blocked','held'));
```

After this, the Custom Trip form should submit cleanly and reserve the date as a hold on the captain/guide's calendar.

## 2. Admin terminology pass

Audit the **admin area only** (`src/routes/_admin/**` and admin-specific components) and replace user-facing copy:

| Old wording | New wording |
|---|---|
| Host / Hosts | Captain/Guide / Captains & Guides |
| Mentor / Mentors | Captain/Guide |
| Aide / Aides | Captain/Guide |
| Course / Courses | Charter / Charters (or Trip where it refers to a single booking) |
| Learner / Learners | Angler / Anglers |
| Student | Angler |

Scope:
- Column headers, page titles, breadcrumbs, button labels, empty-state copy, tooltips, badge labels, filter labels, modal headings.
- Includes `admin.users.index.tsx`, `admin.users.$userId.tsx`, admin dashboard, admin bookings/listings/messages pages, and any admin-only components under `src/components/admin/**`.

Out of scope (not changed in this pass):
- Database column/table names (`aide_id`, `learner_id`, `course_id`, `host_availability`, etc.) — internal only.
- Non-admin pages (captain/guide dashboard, angler-facing flows) — already use correct terms or handled separately.
- Variable/function names in code.

## Verification
- Submit a Custom Trip from the messages thread → expect success, calendar shows a hold on the chosen date.
- Walk the admin pages → no remaining "host / mentor / aide / course / learner / student" strings in UI copy.
