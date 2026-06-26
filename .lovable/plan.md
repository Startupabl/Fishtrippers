Update the Aide Dashboard home to show all six menu options as six cards organized into two columns, and align sidebar labels with the card titles.

Changes:
1. `src/routes/_authenticated/dashboard.tsx`
   - Reorganize `AideDashboardHome` cards into two columns:
     - **Studio**: My Listing & Trips, My Verifications, My Availability
     - **Operations**: My Schedule, My Policies, My Earnings
   - Add two new `NavCard` entries:
     - My Verifications → `/dashboard/verifications` (ShieldCheck icon)
     - My Policies → `/dashboard/manage-policies` (FileText icon)
   - Rename the existing "Manage Availability" card to "My Availability".
   - Keep existing card styling (icons, tinted backgrounds, responsive grid).

2. `src/components/dashboard/WorkspaceSidebar.tsx`
   - Rename "Manage Availability" menu item to "My Availability".
   - Rename "Manage Policies" menu item to "My Policies".
   - No route changes; links remain `/dashboard/master-calendar` and `/dashboard/manage-policies`.

No database or backend changes required.