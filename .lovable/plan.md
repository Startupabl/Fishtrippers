## Update vessel capsule with info icon + guest capacity

**File:** `src/components/listings/OperatorCard.tsx`

### Changes

1. **Add an `Info` icon (lucide-react)** to the left of the "32 ft Boat" label inside the vessel segment, sized `size-3.5` with `text-muted-foreground` so it reads as a subtle "more info" affordance without competing visually with the bold label.

2. **Upgrade from the native `title` attribute to the shadcn `Tooltip`** component (already present at `src/components/ui/tooltip.tsx`). The native `title` can't render two styled lines and only appears after a long delay, so users miss it. The shadcn tooltip:
   - Appears quickly on hover/focus (also keyboard-accessible)
   - Renders two lines:
     - **Line 1 (bold):** full vessel label, e.g. `32 ft Center Console`
     - **Line 2 (muted, smaller):** `Up to {vessel_capacity} Anglers` — only rendered when `vessel_capacity` is present; singular handled (`1 Angler`)
   - Falls back gracefully: if no boat type, just shows length; if no capacity, only line 1 shows

3. **Wrap the listings page (or app root) with `TooltipProvider`** if not already wrapped, so tooltips work. I'll check `__root.tsx` first and add it there once globally if missing, rather than per-card.

### Data
`vessel_capacity` is already returned by `OperatorCardDTO` (sourced from `vessels.max_passenger_capacity`) — no backend or search changes required.

### Icon choice
`Info` (lucide) — the standard "tap/hover for more" affordance. Alternatives considered: `HelpCircle` (feels like "I'm confused"), `ChevronDown` (implies expand). `Info` is the clearest fit.

### Visual sketch

```text
┌─────────────────────────────────┐
│  ⓘ 32 ft Boat  │  ★ 4.8 (12)   │   ← capsule
└─────────────────────────────────┘
        ▲ hover
   ┌────────────────────────┐
   │ 32 ft Center Console   │
   │ Up to 6 Anglers        │
   └────────────────────────┘
```

### Verification
Inspect a charter card: confirm the `ⓘ` icon shows left of "32 ft Boat", hover reveals the two-line tooltip with the full type and "Up to N Anglers", and a card without capacity shows only the type line. Guide cards unaffected.