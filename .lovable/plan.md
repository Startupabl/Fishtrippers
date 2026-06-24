## Goal

Make every email the platform sends — both app/transactional **and** Supabase Auth emails (signup confirmation, password reset, magic link, email change, reauthentication, team invite) — come from `hello@fishtrippers.com` via Resend.

## Current state

- App/transactional emails (booking confirmation to angler + captain, new chat message, custom offer, listing approval/rejection, payout sent, urgent message) already go through `sendEmail()` in `src/lib/email-sender.server.ts` → Resend → `FishTrippers <hello@fishtrippers.com>`. No change needed.
- Auth emails are still sent by Supabase Auth's built-in sender (generic Supabase domain). The `welcome_user`, `email_verification`, `password_reset`, and `magic_link` templates exist in the admin email-templates manager but nothing wires them into the Supabase auth flow.

## What to build

### 1. Supabase Send Email Hook (edge function)

Create `supabase/functions/auth-email-hook/index.ts`. Supabase Auth posts every outbound auth email to this hook; the hook renders the right branded template and sends via Resend.

- Verify the request signature using a hook secret (`SEND_EMAIL_HOOK_SECRET`, generated and stored automatically).
- Read the payload: `user.email`, `email_data.email_action_type` (`signup` | `recovery` | `magiclink` | `email_change` | `email_change_current` | `invite` | `reauthentication`), `token_hash`, `redirect_to`, `site_url`, plus user metadata for first name.
- Build the confirmation URL using `site_url` + `/auth/verify?token_hash=...&type=...&redirect_to=...` (standard Supabase verify endpoint).
- Map each `email_action_type` to one of the existing admin-editable templates (loaded via `email-templates.server.ts`, with the seeded defaults as fallback):
  - `signup` → `email_verification`
  - `recovery` → `password_reset`
  - `magiclink` → `magic_link`
  - `invite` → reuse `email_verification` copy with an "invited" subject override
  - `email_change` / `email_change_current` → reuse `email_verification` copy with subject "Confirm your new email"
  - `reauthentication` → short-circuit template that just contains the OTP token
- Call `sendEmail()` from `email-sender.server.ts` — already pinned to `FishTrippers <hello@fishtrippers.com>`.
- Update template variables so the existing `{{verification_url}}`, `{{reset_url}}`, `{{magic_link}}`, `{{first_name}}` tokens populate correctly. Replace any `"Lumin"` strings in seeded defaults with `"FishTrippers"` so branding is consistent (admin can override later).

### 2. Wire the hook into Supabase Auth

- Register the function in `supabase/config.toml` with `verify_jwt = false` (Supabase calls it unauthenticated and signs the body instead).
- Generate `SEND_EMAIL_HOOK_SECRET` and set it as a project secret so the hook can verify Supabase's HMAC signature.
- Enable the Send Email Hook in Supabase Auth pointing at this function URL.

### 3. Brand-consistency cleanup

- Update the four auth-related rows in `email-templates.defaults.ts` (`welcome_user`, `email_verification`, `password_reset`, `magic_link`) to replace "Lumin" copy with "FishTrippers" + the existing brand voice, so any future "Reset to default" click in the admin gives the right text. (No DB migration — the defaults file is the source of truth, admins re-seed on demand.)

### 4. Verification

- Trigger a test signup → expect a "Verify your email" email from `hello@fishtrippers.com`.
- Trigger a password reset on `/auth` → expect the reset email from the same sender.
- Trigger a magic-link sign-in → same.
- Confirm an existing booking confirmation still arrives (regression check on the transactional path).

## Out of scope

- No SMTP swap inside Supabase (we use the hook, which keeps templates editable in the admin UI).
- No new template kinds — we reuse what already exists in `email_templates`.
- No change to the transactional `sendEmail` flow.

## Prerequisite confirmed by user

`fishtrippers.com` is already verified as a Resend sending domain, so `hello@fishtrippers.com` can ship today.
