## Refine info capsule on OperatorCard

Edit only `src/components/listings/OperatorCard.tsx`.

### Positioning (capsule straddles image bottom edge)
- Move the capsule container OUT of the image div so it can overlap both the image (upper half) and the white card body (lower half).
- Restructure: wrap the image div + capsule + body in a `relative` parent. Capsule absolutely positioned with `left-1/2 -translate-x-1/2` and placed so its vertical center sits on the image/body boundary (e.g. `top-[calc(theme-image-height)] -translate-y-1/2`). Simpler: keep image as before, then render capsule as a sibling with `-mt-5 relative z-10` centered, and add `pt-8` to the body to make room.

### Width
- Change `w-[66%] min-w-[220px] max-w-[320px]` → `w-[90%] max-w-none` so it spans nearly full card width.

### Segments — single line, icons same height
- Use `h-5` for all icons (boat img and Lucide) so they align on one line.
  - Boat icon: `<img className="h-5 w-auto object-contain" />` (fallback `Sailboat className="h-5 w-5"`).
  - Users icon: `h-5 w-5`.
  - Star: `h-5 w-5`.
- Each segment: `flex items-center justify-center gap-1.5 whitespace-nowrap px-2 py-2 text-sm font-semibold`. Add `whitespace-nowrap` to prevent the "Verified" label wrapping.
- Keep `divide` via `border-l border-border/70` on segments after the first.

### Capsule styling
- `rounded-full bg-card shadow-md border border-border/60` (solid bg since it now sits over white too).
- `flex items-stretch` with segments using `flex-1`.

### Out of scope
No data changes, no title/price/image changes.
