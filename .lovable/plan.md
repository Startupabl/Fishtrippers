Tweak `src/components/listings/OperatorCard.tsx` pill content.

**Charters (`business_type !== "guide"`):**
- Remove the guests/capacity segment (Users icon + `vessel_capacity`).
- Remove the `Sailboat` boat icon from the length segment.
- Left segment becomes: `"{vessel_length_ft} ft  {boat_type_name}"` (e.g. `"32 ft Center Console"`). If `boat_type_name` is missing, show just `"{length} ft"`. If `vessel_length_ft` is missing, fall back to `boat_type_name` alone.
- Right segment: Verified / rating — unchanged.

**Guides (`business_type === "guide"`):**
- No change. Pill stays: `Footprints + "Guide"` | Verified/rating.

No DTO or data-layer changes — `boat_type_name` is already in `OperatorCardDTO`.

File touched: `src/components/listings/OperatorCard.tsx` only.