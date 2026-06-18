On the captains dashboard, the Aide workspace home has a card currently labeled "Lab Hours" that links to the profile settings hash. We need to relabel it "Manage Availability" and point it to the existing `/dashboard/master-calendar` page shown in the sidebar.

Changes:
- Edit `src/routes/_authenticated/dashboard.tsx` inside the `AideDashboardHome` Studio section.
- Change the card:
  - title: "Manage Availability"
  - description: "Set your weekly availability and block-out dates."
  - link: `to="/dashboard/master-calendar"`, remove `hash`
  - icon: `CalendarDays` (imported from `lucide-react`)
- Add the missing `CalendarDays` import alongside the existing `Clock` import (or swap `Clock` for `CalendarDays` if no other usage remains). Verify no other code references the old `hash="lab-hours"` path in this file.

No other dashboard or sidebar changes are needed; the sidebar already links to `/dashboard/master-calendar` as "Manage Availability".