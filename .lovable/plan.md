## Match Preview banner & submit button to header gold

The preview page uses Tailwind's `amber-*` palette, which renders orange next to the header's brand gold (`--gold: #E8B547`, `--gold-deep: #C8941F`). Swap to the site's gold tokens.

### Changes — `src/components/operator-listing/PreviewBanner.tsx`

1. Banner wrapper: replace `border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100` with the gold tokens — `border-gold/40`, a soft gold tint background using `color-mix(in oklab, var(--gold) 12%, white)` (via an inline style or a new `bg-gold-soft` utility in `src/styles.css`), and `text-ocean-deep` for legible body copy.
2. Status `<Badge>`: use `border-gold-deep/50`, white background, `text-gold-deep` so it reads as gold, not amber.
3. "Submit for approval" `<Button>`: force gold via `className="bg-gold text-ocean-deep hover:bg-gold-deep"` so it visually matches header gold CTAs instead of using the default primary.
4. "Edit Listing" outline button: add `border-gold text-gold-deep hover:bg-gold/10` so the pair reads as one gold set.

### Optional token addition — `src/styles.css`

Add a single helper used by the banner background so we don't inline color-mix in JSX:
```
.bg-gold-soft { background-color: color-mix(in oklab, var(--gold) 14%, #ffffff); }
```

### Out of scope
No other pages audited this turn. If you'd like, I can do a follow-up sweep for any other `amber-*` / `orange-*` usages across the app and convert them to the gold tokens.
