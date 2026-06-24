Fix the operator card capsule overflow so the "Verified" segment no longer breaks out of the pill.

What we will do:
- Update `src/components/listings/OperatorCard.tsx`.
- Increase the floating pill width from `w-[90%]` to `w-[95%]` so it uses more of the card width.
- Replace `whitespace-nowrap` on each segment with `truncate` (or `line-clamp-1`) so long vessel text like "32 ft Center Console" clips with ellipsis instead of forcing the pill wider.
- Keep the existing split-line separator between the left segment and the Verified segment.
- Leave guides unchanged (they use the same capsule layout, so they will also benefit from the extra width and truncation).

Verification:
- Check the card preview for a charter with a long boat name to confirm the pill stays fully inside the card and the text ends with "...".
- Check a guide card to confirm no regression.

No backend or search changes are needed; this is purely a presentation fix in the card component.