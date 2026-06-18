## Dashboard cleanup for captains with an existing listing

On the captains dashboard (`AideDashboardHome`), make three small layout changes:

1. Remove the "Create New Listing" button from the header — it is no longer needed after the first listing is created.
2. Rename the "My Listing" card to **"My Listing & Trips"**.
3. Reorder the sections so the **Studio** cards appear first (top) and the **Operations** cards appear second (bottom).

### Implementation details

- File: `src/routes/_authenticated/dashboard.tsx`
- Delete the `<Button asChild ...>` block that links to `/create-listing/new` with the `Plus` icon and `Create New Listing` label.
- Update the `NavCard` title from `"My Listing"` to `"My Listing & Trips"`.
- Swap the order of the two `<section>` blocks: move the existing `Studio` section above the `Operations` section, keeping their internal card layouts unchanged.

No other dashboard or sidebar changes are needed.