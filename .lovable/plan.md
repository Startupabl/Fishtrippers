In `src/components/listings/OperatorCard.tsx`, resize the capsule icons while keeping all three segments on one centered line:

- Boat icon: `h-5` → `h-7` (boat image and fallback `Sailboat` both move to `h-7 w-7` / `h-7 w-auto`) — ~30% larger
- `Users` capacity icon: `h-5 w-5` → `h-3 w-3` — ~40% smaller
- `Star` verified icon: `h-5 w-5` → `h-3 w-3`

Alignment is preserved by the existing `flex items-center justify-center gap-1.5` per segment — the row's vertical center stays anchored regardless of icon height, so the larger boat icon visually pops without pushing labels onto a second line. No layout, width, or text-size changes.
