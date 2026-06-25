## Goal

On the listing's left-column contact card (public view + operator preview), show the owner's account-settings identity, and switch the labels to "Guide" when the listing's business type is guide.

## Changes

### 1. `src/components/operator-listing/CaptainCard.tsx`
- Add prop `businessType?: "charter" | "guide" | string | null`.
- Derive `roleLabel = businessType === "guide" ? "Guide" : "Captain"`.
- Replace the hard-coded "Captain" eyebrow with `{roleLabel}`.
- Replace the fallback name `"Captain"` with `roleLabel`.
- Button text: `Contact {roleLabel.toLowerCase()}` ("Contact captain" / "Contact guide").
- Pass `roleLabel` through to `ContactCaptainDialog` as a new `roleLabel` prop.

### 2. `src/components/operator-listing/ContactCaptainDialog.tsx`
- Accept `roleLabel: string` (default `"Captain"`).
- Dialog title fallback: `Contact {captainName || \`the ${roleLabel.toLowerCase()}\`}`.
- Textarea placeholder fallback: `Hi ${captainName || roleLabel}, …`.

### 3. Render sites — pass `businessType={op?.business_type}` to `CaptainCard`
- `src/routes/charters.$location.$businessSlug.tsx` (line ~155)
- `src/routes/_authenticated/operator.preview.tsx` (line ~257)

No other UI on those pages changes. No DB or schema changes.

## Display name + avatar source (verification, no code change needed)

Both server functions that feed these pages already pull the owner's profile and prefer `display_name`:

- `src/lib/operator-public.functions.ts` selects `display_name, avatar_url` from `profiles` and returns `ownerProfile.full_name = prof.display_name || "${first} ${last}" || null`, plus `avatar_url`.
- `src/lib/operator-listing.functions.ts` does the same for the authenticated preview.

The `CaptainCard` already receives `name={captainName}` (derived as `owner?.full_name || op?.display_name || "Captain"`) and `avatarUrl={owner?.avatar_url}`, so the account-settings display name and profile photo are already what's rendered. We will keep the first/last name fallback in place as a safety net when `display_name` is empty.

If you'd rather force "display name only — no first/last fallback", say the word and I'll drop that branch in both server fns.

## Verification

After implementation, on a charter listing the box reads "Captain" + button "Contact captain"; switching `business_type` to `guide` (or viewing a guide's listing/preview) shows "Guide" + "Contact guide", with the owner's account-settings display name and avatar in both cases.
