# Step 5 — Trip Catalog rebuild + live currency

## 1. Profile capabilities (Step 4 update)

Add **Fishing Environments** as a multi-select on the Fishing Focus step (separate from the single Primary Category — captains can fish multiple environments even though they pick one "primary").

Options (matches your list):
- Inshore (shallow, sheltered bays/estuaries/marshes)
- Nearshore (1–10 mi from land)
- Offshore / Deep Sea
- Flats (shallow, clear, sight-fishing)
- Freshwater (lakes/ponds/reservoirs)
- Rivers & Streams
- Backcountry (mangroves/swamp)

DB: add `fishing_environments text[]` to `operators` (migration). Validation: ≥1 required. The Fishing Focus step gets a third section "Fishing Environments" between Primary Category and Target Species.

**Fishing Techniques are NOT on the profile** — they live only on each trip (per your note). Global option list: Trolling, Spinning/Casting, Fly Fishing, Bottom Fishing, Jigging, Popping, Bait & Switch, Live Bait Fishing, Net Fishing, Spearfishing.

## 2. Trip modal rebuild (`TripFormDialog.tsx`)

Replace the current form with a full professional modal in this exact order:

1. **Trip Title** — text input
2. **Trip Details**
   - Start Time — time picker (HH:MM)
   - Trip Duration — dropdown: 4h / 6h / 8h / 12h (replacing today's 2–16h list)
3. **Description & Itinerary**
   - Description — multiline textarea, line breaks preserved, "Show More" toggle on the public trip page (>200 chars)
   - Itinerary — multiline textarea, with helper text: *"For reference only. Itineraries are subject to change due to weather conditions."*
4. **Scoped selections** — pull from the captain's profile capabilities:
   - **Target Fish** — searchable multi-select, scoped to captain's `target_species`. Inline "Edit Capabilities" link → routes to Fishing Focus step. Empty-state: "Add species to your profile first."
   - **Fishing Environment** — multi-select, defaults to the captain's profile environments, captain can narrow down. Max 2 per trip.
   - **Fishing Techniques** — multi-select from the global list (no profile scoping). ≥1 required.
5. **Pricing**
   - **Base Price (1st angler)** — currency input in captain's base currency (locked to operator currency, shown as a label e.g. "USD")
   - **Max party size** — number input (capped at vessel seating)
   - **Price per additional angler** — currency input (the "add-on"). Helper: "Charged for each extra guest beyond the first."
   - **Total preview at full party** — calculated read-only: `base + (max_party − 1) × per_extra`. Updates live.

Cancel / Save buttons in the footer.

## 3. Public Trip Page — currency display

The Captain enters prices in their base currency (e.g. USD). On the public trip page:

- Show `Base price`, `Per additional angler`, and a "Total for N guests" selector (1 → max party).
- All three figures route through `useFormattedPrice(minor, captainCurrency)` so they re-render when the global currency switcher changes.
- Disclaimer near the price block: *"Prices are converted in real time. The final charge will be processed in {Captain's Base Currency}."*

## 4. Live FX via Frankfurter

- New server fn `getFxRates` (`src/lib/fx.functions.ts`) → fetches `https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,CAD,AUD`. Cached in-memory for 12h.
- New React hook `useFxRates()` (TanStack Query, `staleTime: 12h`) — hydrates `useCurrencyStore` rates on app boot.
- `src/lib/currency.ts`: replace the static `FX_RATES` constant with a live cache populated from the hook; keep the same `convertMinor()` signature so existing call sites (`useFormattedPrice`, `formatPrice`) keep working unchanged. Fallback to the current static table when the API is unreachable.
- Wire `useFxRates()` once in `__root.tsx`.

## 5. DB changes (one migration)

`trip_packages` — add columns:
- `start_time time` (nullable)
- `itinerary text` (nullable)
- `target_species text[] default '{}'`
- `environments text[] default '{}'`
- `techniques text[] default '{}'`
- `per_extra_minor integer default 0 check (per_extra_minor >= 0)`
- `max_party_size` already exists — keep, make required (NOT NULL default 1)

`operators` — add:
- `fishing_environments text[] default '{}'`
- `base_currency text default 'USD'` (already may have a currency-ish field — verify; this is what trip prices are entered in)

Update `tripInputSchema` in `src/lib/trips.shared.ts` to validate the new fields. Update `upsertTrip` server fn.

## 6. Files touched

- `supabase/migrations/...` (new) — schema additions
- `src/lib/operators.shared.ts` — add `FISHING_ENVIRONMENTS` constant + zod
- `src/components/operator-onboarding/steps/FishingFocusStep.tsx` — add Environments multi-select section
- `src/stores/useOperatorOnboardingStore.ts` — `fishing_environments` field + setter
- `src/lib/trips.shared.ts` — new schema, duration options trimmed to 4/6/8/12h
- `src/lib/trips.functions.ts` — pass through new fields
- `src/components/operator-onboarding/trips/TripFormDialog.tsx` — full rewrite per spec
- `src/components/operator-onboarding/steps/TripCatalogStep.tsx` — list cards show new price preview (`base · +per-extra · max N`)
- `src/lib/fx.functions.ts` (new) — Frankfurter fetcher
- `src/hooks/useFxRates.ts` (new)
- `src/lib/currency.ts` — live cache + fallback
- `src/lib/format-currency.ts` — disclaimer helper exporting captain currency label
- `src/routes/__root.tsx` — call `useFxRates()` once
- Public trip-page price block (will identify exact file during implementation — likely `c.$categorySlug.$listingSlug.tsx` or a new trip detail route)

## Out of scope

- Booking flow / Stripe handoff with the new pricing — to follow once display is verified.
- Per-trip Start Date / availability calendar — Start Time only for now, dates handled later in scheduling.
- Translating the itinerary disclaimer (English only for v1).
