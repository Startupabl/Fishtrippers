## Goal
Replace the existing `FishTrippersProcess` section on the home page with a modern, 3-step "How Fishtrippers Works" section.

## Changes (single file: `src/routes/index.tsx`)

1. **Imports** — drop unused process icons (`LayoutGrid`, `Handshake`, `GlassWater`, `RefreshCw`) and add `Search`, `CalendarCheck`, `Waves` from `lucide-react`. Remove `useEffect`/`useRef`/IntersectionObserver usage from this section (no longer needed).

2. **Replace `PROCESS_STEPS`** with 3 entries:
   - `Search` · "1. Find Your Perfect Trip" · "Browse the best local charters, fishing guides, and walk-and-wade experts. Filter by your favorite environment, target fish, or preferred style of fishing."
   - `CalendarCheck` · "2. Book Your Way" · "Lock in your dates instantly with Instant Booking, or message a captain directly to build a fully customized, tailor-made fishing adventure."
   - `Waves` · "3. Hit the Water" · "Show up at the dock or the shoreline, meet your expert guide, and enjoy a hassle-free day of world-class fishing!"

3. **Rewrite `FishTrippersProcess`** as a clean 3-column section:
   - Section header centered: "How Fishtrippers Works" (same Plus Jakarta Sans 800, deep-navy `#0A2540`, with "Fish" in brand gold `#E8B547`). Short muted subhead under it.
   - Grid: `grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8`.
   - Each step is a centered card: `rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`.
   - Icon in a circular brand-gradient badge (`from-[#E8B547] to-[#0A2540]`, white icon, `size-14` rounded-full) centered at top.
   - Title in Lora serif (`#0A2540`), body in muted text, all center-aligned.
   - Keep `prefers-reduced-motion` friendly (transitions only, no JS observers).

4. Section wrapper keeps `border-b border-border bg-card/40` and existing `max-w-[1600px]` container so it slots into the page unchanged. `<FishTrippersProcess />` call site (line 498) stays the same.

No other sections, routes, or data changes.
