Fix hero search bar alignment on desktop.

**Issue:** `HeroBookingBar` uses `mx-auto max-w-5xl`, which centers the bar within the hero container. The hero heading/subhead are left-aligned (`max-w-3xl` / `max-w-2xl` with no `mx-auto`), so on wide screens the search bar sits offset to the right of the text. On smaller screens both fill the container, so the misalignment isn't visible.

**Change** (`src/components/layout/HeroBookingBar.tsx`, line 27):
- Remove `mx-auto` so the bar anchors to the left edge of the hero container, matching the heading.
- Keep `max-w-5xl` so the bar doesn't stretch all the way to 1600px.

No other files touched.