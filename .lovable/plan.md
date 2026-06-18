## Refactor TripsBlock into Accordion Cards

Single file change: `src/components/operator-listing/TripsBlock.tsx`. No backend, no pricing math changes (the per-trip deposit/total/balance calc already exists and stays local to each card so other trips are unaffected).

### 1. Accordion behavior
- Each `TripCard` owns its own `open` state via `useState`. First card defaults to open, the rest collapsed.
- Toggle via a `<button>` wrapping the header (full-width, keyboard accessible, `aria-expanded`, `aria-controls`).
- Body uses a CSS grid-rows transition (`grid-rows-[0fr]` ↔ `grid-rows-[1fr]` with `overflow-hidden`) for smooth slide. No external lib.
- Each card's state is independent — guests/currency changes in one card never touch another.

### 2. Collapsed header (always visible)
Two-line flex layout inside the toggle button:

```text
[ Trip Title (bold 16px) .................... From $XXX  ⌄ ]
[ Up to N guests · Departs 7:00 AM · Marina Name · 4h trip (Inshore) ]
```

- Top row: `flex justify-between items-center`. Left: title. Right: "From {baseDisplay}" + animated `ChevronDown` (rotates 180° when open).
- Meta row: small muted text with `·` separators. Pieces only render if data present: max guests, departure time, departure_location/address (truncated), duration + first environment/technique label in parens.

### 3. Expanded body
- Slides down below the header inside the same card.
- Inner container: `p-5 lg:p-6` with `lg:min-w-[380px]` so prices don't wrap.
- Order: description + species/env chips (left/top) → **Guest selector** → **Payment summary** → **Check Dates / Request to Book button** → helper note.
- Drop the two-column grid; stack vertically so the payment box gets full card width on desktop.

### 4. Dynamic pricing
Already wired: `guests` state + `useCurrencyStore` + `convertMinor` + `formatCurrency`. Keep as-is. Recalc happens on every render so guest or currency change updates instantly, only for that card.

### 5. Payment summary visual hierarchy

```text
┌────────────────────────────────────────────────┐
│  DUE NOW TO BOOK                               │  ← green band
│  (Charged today to secure your spot)           │
│                                                │
│  $XX.XX     ← massive, bold, green             │
└────────────────────────────────────────────────┘
  Total Trip Cost:                       $XXX.XX
  Remaining Balance                      $XXX.XX
  (Paid directly to guide at boat)
```

- Replace current gold-themed callout with a green theme: `bg-emerald-50 border-emerald-200`, label `text-emerald-900 font-bold uppercase tracking-wide text-sm`, deposit price `text-4xl font-extrabold text-emerald-600` (or `text-emerald-700` for AA contrast).
- Rows below: `flex justify-between items-baseline`, prices `whitespace-nowrap font-semibold`.
- Remaining-balance helper text sits inline (smaller) under the row label, matching the spec.

### 6. Checkout button + footer note
- Keep existing Check Dates / Request to Book button logic untouched.
- Add below the button: `<p class="mt-2 text-xs text-muted-foreground text-center">You are only paying a 10% deposit online today. The remaining 90% balance is paid directly to your captain at the dock.</p>`

### Out of scope
- Pricing formulas, currency hook, CheckDates/RequestToBook dialogs, booking-type branching, parent `TripsBlock` header.
- No new dependencies (no Radix Accordion needed — local state keeps each card truly independent and avoids shared-context resets).
