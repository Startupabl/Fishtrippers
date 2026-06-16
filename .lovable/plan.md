## Goal
When a captain/guide clicks **Dashboard → Listings → Edit listing**, the onboarding wizard should load their saved listing data and show it in every step so it can be edited. No blocker screen should appear.

## Plan
1. **Make edit mode explicit**
   - Update the Edit listing links to navigate to `/mentor/create-path` with an edit indicator instead of the current `new` search state where needed.
   - Prevent any local blank draft from being treated as the source of truth when editing an existing listing.

2. **Load before showing the wizard**
   - In `/mentor/create-path`, fetch the current operator listing, vessel, and any related data needed for the onboarding steps.
   - Show a loading state until the server data has been applied, so users do not briefly see empty fields.

3. **Hydrate all onboarding store fields**
   - Ensure the store hydration fills: business type, display name, about, primary meeting point, boat details, fishing focus, booking rules, and submitted status.
   - Confirm the recent Primary Meeting Point fields hydrate from the saved default departure address/city/state data.

4. **Fix missing related-step data if needed**
   - If trips/gallery are not part of the current operator fetch, add or reuse the existing trip fetch in the step components so those lists repopulate from the backend when opened.
   - Keep saving behavior unchanged; this is only to make edit mode prefill saved data.

5. **Verify the flow**
   - Use the preview flow to confirm clicking Edit listing lands in the wizard with existing fields populated and editable across all steps.