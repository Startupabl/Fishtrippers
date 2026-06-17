Edit `src/components/listings/OperatorCard.tsx`:

1. **Boat icon**: Remove the dynamic `boat_type_icon_url` image. Always render the static `Sailboat` lucide icon for every card (same one used originally).
2. **Icon sizes**: Set all three capsule icons (`Sailboat`, `Users`, `Star`) to the same size as the white-section icons — `size-4` (matching `ShieldCheck` in the title row).
3. **Remove "Trips from"**: Delete the `<span className="text-xs text-muted-foreground">Trips from</span>` line in the footer price row, leaving only the price (or "Contact for pricing" fallback).

No other changes — layout, capsule width (90%), and one-line alignment remain intact.