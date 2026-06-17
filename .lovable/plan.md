## Goal
Make `/search` query real operator listings (not the legacy `journeys` table), with the search bar at the top of the page, FishingBooker-style filter pills underneath, and cards that match your uploaded reference. Reuse the same card everywhere we surface listings (search + homepage featured).

## 1. New server function: `searchOperatorsServer`
File: `src/lib/operators-search.functions.ts` (new)

Query `operators` joined with the cover `operator_photos` row, the `vessels` row, and the cheapest active `trip_packages` row. Returns plain DTOs:

```ts
type OperatorCardDTO = {
  id, slug, display_name,
  city, state, country,
  cover_image_url,           // first photo (is_cover, else position 0)
  vessel: { length_ft, max_passenger_capacity } | null,
  booking_type,              // 'instant' | 'inquiry'
  verified: true,            // approved+published listings are "verified" for now
  lowest_price: { minor, currency, label } | null,  // from cheapest published trip
}
```

Filters accepted (all optional, AND-combined):
- `city` (ilike on `default_departure_city`)
- `category` (matches `fishing_environments @> {<env_id>}`, mapped from category name → env slug)
- `instantBook` (booking_type = 'instant')
- `q` (ilike on display_name)

Visibility rule: only `moderation_status='approved'` AND `status='published'`.

If a trip has no published package yet, fall back to the cheapest `draft` so the existing test listing still shows a price (toggle behind a flag we can flip later).

## 2. New `OperatorCard` component
File: `src/components/listings/OperatorCard.tsx` (new)

Layout (matches `search_2.jpg`):
- Cover image (16/10), rounded
- Pill row over image bottom: `[🚤 30 ft]`  `[👥 6]`  `[✅ Verified]`
- Title: `display_name`
- Row: 📍 `City`
- Row (if instant): ⚡ Instant Confirmation
- Footer: "Trips from" + `From US $1,200` formatted via the trip's `currency`

Use design tokens (no hardcoded colors). Click → `/c/$categorySlug/$listingSlug` using primary environment as category slug (same pattern already in `c.$categorySlug.$listingSlug.tsx`).

## 3. Rebuild `/search` page
File: `src/routes/search.tsx` (rewrite)

### Search schema
Drop `level`. Add:
```
q, city, category, instantBook,
duration, priceMin, priceMax,
departureTime, technique, species,
tripDate, adults, children
```
All optional, with `fallback(...)`.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [📍 City ▼] [📅 Trip Date ▼] [👥 2 adults • 0 children ▼] [Search] │  ← top bar (sticky)
├─────────────────────────────────────────────────────────────┤
│  [↕ Sort] [⚙ Filters] [⚡ Instant Book] [Duration ▾] [Price ▾]   │
│  [Departure Time ▾] [Fishing Technique ▾] [Target Fish ▾] [Category ▾]│
├─────────────────────────────────────────────────────────────┤
│  "{City}: N fishing charters available"                      │
│  Grid of OperatorCard (1/2/3 cols responsive)                │
└─────────────────────────────────────────────────────────────┘
```

No left sidebar — sidebar code removed.

### Wiring (this turn)
- City: free-text input with debounced URL sync → server filter.
- Category pill: opens a popover listing the 7 fishing environments (from the seeded `categories` table); writes URL param; server filters by `fishing_environments` array.
- Instant Book toggle pill → server filter.
- `q` search input remains.
- Trip Date / Adults+Children: render the controls but they're static for now (write to URL, don't filter — calendar/availability comes later).
- Duration, Price, Departure Time, Fishing Technique, Target Fish: rendered as static popover pills with "Coming soon" content so the layout is real but they don't filter yet.
- Sort: static "Recommended" for now.

## 4. Homepage uses the same card
File: `src/routes/index.tsx`

Replace the "featured journeys" section's `LiveJourneyCard` usage with `OperatorCard`, backed by a new `listFeaturedOperators` server fn (same shape as search, no filters, ordered by `featured DESC, priority_order DESC, created_at DESC`, limit 6). `LiveJourneyCard` stays in the codebase for now but is no longer used on these surfaces.

## 5. Heads-up on your existing test listing
Your one approved listing (`Blue Ocean Charters`) currently has:
- `default_departure_city = null`
- only a `draft` trip package

After this change:
- It will appear on `/search` only when **no city filter** is set (or you populate the city in the operator profile).
- Pricing pill will show "From US $200" using the draft trip (with the draft-fallback flag enabled). Once you publish the trip, the fallback is no longer needed.

I won't edit the listing data — you can fill in city/publish the trip from the operator dashboard.

## Out of scope (call out as future work)
- Real availability/date filtering
- Wiring Duration / Price / Departure Time / Technique / Species filters to the query
- Map view ("Show on map")
- Sort options other than Recommended
- Ratings (you said use "Verified" badge for now)

## Technical notes
- New file path: `src/lib/operators-search.functions.ts` (client-safe, callable via `useServerFn`).
- DTOs only — no Supabase client instances cross the RPC boundary.
- All filter state lives in URL search params via `validateSearch` + `useNavigate({ search: prev => ... })`.
- Price formatting uses `Intl.NumberFormat(undefined, { style: 'currency', currency })` server-side so the card just renders the label string.
