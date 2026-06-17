## 1. Remove the "What's Biting" block

- **`src/routes/_authenticated/operator.preview.tsx`** — remove the `<WhatsBitingStub />` render (line ~245) and its import (line 20).
- **`src/components/operator-listing/SectionNav.tsx`** — remove the `{ href: "#biting", label: "What's biting", icon: Sparkles }` nav item (line 6), and drop `Sparkles` from the lucide-react import if unused after that.
- **`src/components/operator-listing/WhatsBitingStub.tsx`** — delete the file (no other references in the codebase).

This covers all listing views since `operator.preview.tsx` is the single shared listing detail surface used for preview/edit/view.

## 2. Refresh / logout-login loop — investigate, do not patch blindly

I won't change auth code in this plan. The symptom (auto refresh every few minutes, brief sign-out then sign-in) is almost always one of:

1. Supabase token auto-refresh firing a `TOKEN_REFRESHED` (and sometimes a transient `SIGNED_OUT` → `SIGNED_IN`) event, and an `onAuthStateChange` listener somewhere calling `window.location.reload()` or `navigate` on every event.
2. A query that runs before the session is hydrated, 401s, and triggers a forced sign-out.
3. The Vite dev overlay "Failed to fetch dynamically imported module" error (already showing in runtime errors) causing a hard reload of the preview tab — this looks like a logout because the page flashes.

Proposed investigation step (no edits yet): once you approve, I'll grep for `onAuthStateChange`, `signOut`, `location.reload`, and `navigate(.*auth` across `src/`, read the hits, and report what's actually wired before proposing a fix. If it turns out to be #3 (dev-only HMR reload), there's nothing to fix in app code.

## Out of scope
No design, copy, or other listing-section changes.