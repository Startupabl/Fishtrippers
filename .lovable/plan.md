**Goal:** Increase the trip description font size to match the About block, and remove duplicated metadata lines from the trip card header.

**Changes:**

1. `src/components/operator-listing/TripsBlock.tsx`
   - Remove the duplicated metadata lines from the collapsed header (Experience, capacity, species, start time, departure address). These are already visible inside the expanded trip details.
   - Change the Trip Description paragraph from `text-sm` to inherit the body font size (matching the About block). Update the "Trip Description:" label to match accordingly.

2. Verify layout remains intact on both desktop and mobile after removing the header metadata lines and the font-size bump.

**No database or server changes required.**