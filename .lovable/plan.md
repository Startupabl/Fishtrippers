# Brand color alignment

Lock the site to the two brand colors and fix the spots that drifted (footer near-black, leftover green check marks, a second yellow, and admin pages using raw hex instead of tokens).

## Brand colors (single source of truth)

- Blue: **Ocean Deep `#0A2540`** (already `--primary` / `--ocean-deep`)
- Yellow: **Gold `#E8B547`** (already `--accent` / `--gold`)

These already exist in `src/styles.css` and `src/lib/brand.ts`. No new tokens needed — we only stop using off-brand hex values and route everything through `primary` / `accent` (or the existing `--ocean-deep` / `--gold` variables for inline styles).

## Off-brand values to replace

| Current | Used for | Replace with |
|---|---|---|
| `#0A0F1A` (near black) | Footer background + hover text | `#0A2540` (Ocean Deep) |
| `#1F6B36` (green) | Check / success icon color in 5 components | `#0A2540` (Ocean Deep) — checks become brand blue |
| `#FFD23F` (bright yellow) | Availability editor, banners, custom-offer composer borders/bg | `#E8B547` (Gold) + matching soft tint |
| Raw `#0A2540` / `#E8B547` inline styles in admin pages | Status pills, dots, buttons | Tailwind `bg-primary`/`bg-accent` tokens (or `var(--ocean-deep)` / `var(--gold)` if inline style is required) |

## Files to edit

**Footer (highest visibility):**
- `src/components/layout/SiteFooter.tsx` — swap both `#0A0F1A` → `#0A2540` so the footer is the brand blue on every page.

**Green → brand blue checks/icons:**
- `src/components/layout/AlertsBellButton.tsx`
- `src/components/layout/AlertsOnlyBellButton.tsx`
- `src/components/layout/MessagesIconButton.tsx`
- `src/components/mentor-express/PreviewStep.tsx` (2 spots)
- Any remaining `#1F6B36` from the rg list — replace 1:1.

**Second yellow → Gold:**
- `src/components/availability/AvailabilityEditor.tsx` (`SUNNY_YELLOW` constant)
- `src/components/availability/AvailabilityDrawer.tsx` (left border)
- `src/components/availability/LocationMissingBanner.tsx` (border/bg/text — text stays brand blue)
- `src/components/chat/CustomOfferComposer.tsx` (border + bg of warning card)
- `src/components/chat/FileMessageBubble.tsx` (own-message bubble tint → soft gold)

**Admin pages — switch to tokens:**
- `src/routes/_admin/admin.queue.tsx` — `style={{ backgroundColor: "#0A2540" }}` buttons → `className="bg-primary text-primary-foreground"`; status pill `bg-[#0A2540]/10 text-[#1f6b3a]` (green text!) → `bg-primary/10 text-primary`; check icon `text-[#0A2540]` → `text-primary`.
- `src/routes/_admin/admin.index.tsx` — gold status dot inline hex → `bg-accent`.

**Brand alias cleanup (no logic change):**
- `src/lib/brand.ts` — keep legacy aliases (`leafGreen`, `sunnyYellow`, `accentGreen`) already pointing at ocean/gold; leave as-is.

## Out of scope

- No changes to typography, spacing, layout, or component structure.
- No changes to `--money` (green money badges stay green — that's a semantic status color, not branding) or `--destructive` (red).
- Third-party brand colors stay correct: Google sign-in (`#4285F4` etc.), social share buttons (Facebook/LinkedIn/Instagram brand hexes).
- Dark mode tokens untouched.

## Verification

After edits: visit `/` (footer), `/dashboard`, `/admin`, `/admin/queue`, an availability editor, and a chat with a custom offer — confirm every accent is either Ocean blue or Gold, and the footer is `#0A2540` on every page.
