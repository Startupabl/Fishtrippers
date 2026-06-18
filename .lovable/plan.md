## Problem

On `/onboarding/choice` (the popup shown after saving account settings), the **"I want to list my fishing trips"** card links to `/create-listing`, which is just a marketing/info page — not the actual listing creation flow.

The site header's **Create a Listing** button correctly navigates to `/mentor/create-path?new=true` (the real Mentor Express listing builder).

## Fix

Update `src/routes/onboarding.choice.tsx` so the "I want to list my fishing trips" `<Link>` matches the header button:

- `to="/mentor/create-path"` (instead of `/create-listing`)
- add `search={{ new: true }}`
- keep existing `onClick={guard(startNewMentorExpressListing)}`

No other files need to change — the header, avatar menu, and dashboard "Create a Listing" buttons already point to the correct route.
