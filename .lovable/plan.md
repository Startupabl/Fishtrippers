## Replace Twitter bird with the X logo

Lucide-react doesn't ship an official X brand mark, so I'll inline a small SVG.

**Edit `src/components/operator-listing/ShareDialog.tsx`:**

1. Remove `Twitter` from the `lucide-react` import.
2. Add a tiny local `XIcon` component — an inline SVG of the X wordmark (two crossed strokes), using `currentColor` and accepting a `className` so it sizes/colors like the other icons.
3. In the `links` array, change the X entry:
   - `label: "X"` (drop "(formerly Twitter)")
   - `icon: XIcon`
4. Leave the share intent URL (`https://twitter.com/intent/tweet?...`) unchanged — that endpoint still works for X and is the documented share URL.

No other files change.