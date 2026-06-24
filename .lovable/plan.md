## Goal

Route all Supabase Auth emails through `hello@fishtrippers.com` using **Resend SMTP**, since Send Email Hooks are not exposed in the Lovable Cloud UI.

## Why this path

- Lovable Cloud doesn't expose Supabase Auth Hooks configuration, so the `auth-email-hook` edge function we built has no UI to be activated. Without activation, Supabase will never call it.
- Cloud DOES expose Custom SMTP under Cloud → Users → Auth Settings → Email settings. Pointing it at Resend's SMTP server with `hello@fishtrippers.com` as sender achieves the same end result: every auth email goes out from your domain via Resend.
- The transactional path (booking confirmations, messages, payouts, etc.) is untouched — it continues to use `sendEmail()` → Resend SDK directly.

## What you'll do (one-time, in Cloud UI)

Cloud → Users → Auth Settings → Email settings → **Enable custom SMTP**, then enter:

| Field | Value |
| --- | --- |
| Sender email | `hello@fishtrippers.com` |
| Sender name | `FishTrippers` |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` |
| SMTP user | `resend` |
| SMTP password | your `RESEND_API_KEY` value (the same one already stored as a project secret) |
| Minimum interval | leave default |

Save. Auth emails immediately start routing through Resend.

## What I'll do in code

### 1. Remove the dead auth-email-hook function

Delete `supabase/functions/auth-email-hook/` and its `config.toml` block. It can't be wired up in Cloud, so leaving it there is just confusing.

### 2. Delete the unused hook secret

Remove `SEND_EMAIL_HOOK_SECRET` from project secrets — nothing reads it now.

### 3. Customize the Supabase auth email templates in Cloud

Supabase ships default templates ("Confirm signup", "Reset password", "Magic link", "Change email"). After SMTP is enabled, I'll give you the exact branded HTML to paste into each of those templates in Cloud → Users → Auth Settings → Email templates — matching the FishTrippers tone we already use for the admin-editable templates, with the right `{{ .ConfirmationURL }}` / `{{ .Token }}` Supabase variables.

### 4. Brand cleanup (already done last turn, keep as-is)

The `welcome_user`, `email_verification`, `password_reset`, `magic_link` defaults in `src/lib/email-templates.defaults.ts` are already rewritten to FishTrippers branding. They remain useful as the source-of-truth for the in-app templates manager, even though Supabase Auth won't read them.

## Verification

1. After you save SMTP settings, request a password reset on `/auth`. Email should arrive from `hello@fishtrippers.com`.
2. Sign up a new test user. Confirmation email should arrive from the same address.
3. Existing booking confirmation flow continues to work (regression sanity check).

## Out of scope

- Send Email Hook (not available in Cloud UI).
- Switching transactional emails away from the Resend SDK — they already send from `hello@fishtrippers.com`.
