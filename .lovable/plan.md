## Goal
Let you create your first account right now without the Turnstile bot-check blocking signup, while keeping the option to re-enable it later for production.

## Changes

1. **Clear the stale Turnstile site key**
   - Remove `VITE_TURNSTILE_SITE_KEY` from `.env` (the key copied from the previous project is invalid for this preview domain and is causing error 110200).

2. **Make Turnstile optional in the code**
   - Update the signup and login forms (and any shared Turnstile wrapper) so that when `VITE_TURNSTILE_SITE_KEY` is empty/undefined:
     - The Turnstile widget is not rendered.
     - The submit handler skips the token check and proceeds straight to Supabase auth.
   - When the key IS set, behavior is unchanged — widget renders and token is required.

3. **Verify**
   - Reload `/register`, confirm no Turnstile widget appears and no 110200 error in console.
   - Create a test account end-to-end and confirm the user lands signed in (profile row auto-created by existing `handle_new_user` trigger).

## Out of scope
- No changes to auth providers, RLS, profile schema, or any other feature.
- Re-enabling Turnstile later for the production domain is a one-line env change (add a fresh key) — no code work needed.
