## Problem
The current "Login As" flow generates a Supabase magic link and opens it in a new tab with `window.open(actionLink, "_blank", "noopener")`. This fails in multiple ways:
- Popup blockers can swallow the new tab silently.
- The magic-link URL hits Supabase's `/verify` endpoint, which only redirects to `redirectTo` if it's in the project's allow-list — otherwise it falls back to `site_url` (or errors), so the admin ends up nowhere useful.
- Even when it succeeds, it replaces the admin session in the same browser, so the admin gets locked out (the existing toast literally warns about this).

Server logs show no `impersonateUser` invocation for the recent click, meaning the user is getting a client-side failure / silent popup-block, not a backend error.

## Fix — rebuild impersonation as in-tab session swap

Stop relying on the magic-link redirect flow. Use the same generated token, but exchange it directly with Supabase from the admin's browser, after saving the admin session so they can swap back.

### 1. `src/lib/admin.functions.ts` — `impersonateUser`
- Drop the `redirectTo` input and allow-list check (no longer needed).
- Return `{ email, tokenHash }` from `properties.hashed_token` (instead of `actionLink`).
- Keep the `assertAdmin` guard and `auth.admin.generateLink({ type: 'magiclink', email })` call.

### 2. New helper `src/lib/impersonation.ts`
- `IMPERSONATION_KEY = "lovable.admin_session_v1"`
- `startImpersonation({ tokenHash, targetUserId })`:
  - `const { data: { session } } = await supabase.auth.getSession()` → store `{ access_token, refresh_token, admin_user_id, target_user_id }` in `sessionStorage`.
  - `await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })`.
- `stopImpersonation()`:
  - Read saved tokens, call `supabase.auth.setSession({ access_token, refresh_token })`, remove the storage key, return `admin_user_id` for redirect.
- `getImpersonationState()` → null or `{ admin_user_id, target_user_id }`.

### 3. `src/routes/_admin/admin.users.$userId.tsx`
- Mutation calls server fn → `await startImpersonation({ tokenHash, targetUserId: userId })` → `navigate({ to: '/dashboard', search: { impersonating: 1 } })`.
- Toast error if `verifyOtp` returns an error (real error surfaces now).

### 4. New `<ImpersonationBanner />` in `src/routes/__root.tsx`
- Reads `getImpersonationState()` on mount + listens to `storage` event.
- When active: fixed top banner "Impersonating {email} — [Switch back to admin]" using existing lime styling.
- "Switch back" → `stopImpersonation()` → `navigate({ to: '/admin/users/$userId', params: { userId: admin_target_user_id } })`.

This replaces the existing `search.impersonating` inline banner on the admin user page (now redundant, since the admin is no longer on that page during impersonation).

## Why this works
- No popup, no new tab — the button "just signs you in as them" in the same tab, exactly what was asked.
- No dependency on Supabase redirect allow-list or `site_url` — token exchange is direct.
- Admin session is preserved in `sessionStorage` (per-tab, auto-cleared on tab close) so the admin can switch back with one click.
- Real errors from `verifyOtp` / `generateLink` surface as toasts instead of silent popup blocks.

## Out of scope
- Audit-log table for impersonation events.
- Multi-tab/persistent impersonation (sessionStorage is intentional — closing the tab restores admin via normal sign-in).
- Changing Supabase Auth allow-list URLs.
