Widen the hero search bar so the guests label ("X adults, Y children") fits on one line.

**Change** (`src/components/layout/HeroBookingBar.tsx`, line 27):
- Remove `max-w-5xl` so the bar spans the full width of the hero container (already capped at `max-w-[1600px]` by the parent). The bar will stay left-aligned and extend across the row, giving the guests cell enough room to render on one line.

No other files touched.