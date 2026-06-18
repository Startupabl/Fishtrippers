# Functional Share Button on Listing Page

Currently the Share icon in `HeaderGallery` is a non-functional button. We'll make it open a share dialog matching the reference design.

## What gets built

A "Share this experience" modal triggered by the existing Share icon, containing:

- **Title:** "Share this experience" with a close (X) button.
- **Prefilled message:** `I just found this {Listing Name} in {City, Region} on FishTrippers. Check it out!`
- **Share links** (stacked rows with icon + label, divider between each):
  - Facebook → `https://www.facebook.com/sharer/sharer.php?u={url}&quote={text}`
  - Messenger → `fb-messenger://share?link={url}` (falls back to `https://www.facebook.com/dialog/send?...`)
  - X (formerly Twitter) → `https://twitter.com/intent/tweet?url={url}&text={text}`
  - Email → `mailto:?subject=...&body={text}%20{url}`
- **"or" divider**
- **"Share this link"** label + read-only input with the page URL
- **"Copy link"** primary button (shows "Copied!" state briefly on success)

Each share link opens in a new tab (`target="_blank" rel="noopener"`).

## Files to change

1. **New:** `src/components/operator-listing/ShareDialog.tsx`
   - Props: `open`, `onOpenChange`, `title` (listing name), `location` (city, region), `url`.
   - Uses existing `Dialog` from `@/components/ui/dialog` and `Button` / `Input`.
   - Icons from `lucide-react`: `Facebook`, `MessageCircle`, `Twitter` (or `X`), `Mail`.
   - Computes share URL client-side: prefer `window.location.href`, fallback to passed-in `url`.
   - `navigator.clipboard.writeText` for Copy link.

2. **Edit:** `src/components/operator-listing/HeaderGallery.tsx`
   - Add `const [shareOpen, setShareOpen] = useState(false)`.
   - Wire existing Share button `onClick={() => setShareOpen(true)}`.
   - Render `<ShareDialog open={shareOpen} onOpenChange={setShareOpen} title={title} location={location} />` at the bottom of the section.

## Out of scope

- No backend changes, no analytics tracking, no QR code, no SMS/WhatsApp.
- Styling stays consistent with existing shadcn dialog patterns; not pixel-cloning FishingBooker's modal, just matching its structure (title, message, link rows with dividers, "or", URL input, Copy button).
