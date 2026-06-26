## Fix: Restore Shared Tour pricing inputs

I incorrectly changed the **Shared Tour** pricing inputs while updating Private Charter. Shared Tour must keep its original two-price model.

### Changes to `src/components/operator-onboarding/trips/TripFormDialog.tsx`

**Shared Tour (charters) — restore original fields:**
- Label: `Base price (1st angler)` (was wrongly changed to "Price per Seat")
- Add back the **Price per additional angler** input (currently hidden for shared)
- Keep **Total Seats Available** and **Minimum Seats to Sail (optional)** as-is
- Helper text: "Charged for each additional angler beyond the first, up to total seats."

**Guides (small_group_trip) — unchanged:** keeps "Price per Person" / Total Spots / Min Spots.

**Private Charter — unchanged:** keeps single "Base Price (Entire Boat)" with helper subtext referencing max party size.

**Private (charter `private_charter` and guide `private_trip`) — unchanged:** still shows "Base price (1st angler)" + "Price per additional angler" for non-private-charter privates.

### Logic adjustment
- Update the gate on the "Price per additional angler" block so it also renders for `shared_tour` (charters), not only non-shared/non-private-charter.
- `totalPreview` for shared tour: `price_minor + (seats_available - 1) * per_extra_minor` when both are set.
- Reset `per_extra_minor` to 0 only when switching to `private_charter` or guide `small_group_trip` (not when switching to charter `shared_tour`).