## Goal

Make every email FishTrippers sends — auth (signup, password reset, magic link, email change, reauth, invite) and app emails (booking confirmations, messages, payouts, listing approvals, etc.) — go out from `noreply@fishtrippers.com`, with auth emails powered by Lovable's native auth email scaffolder.

## Pieces involved

1. **Lovable email domain** — DNS-verified sender domain managed by Lovable. Lovable delegates a subdomain (e.g. `notify.fishtrippers.com`) via NS records that you add at your DNS provider; that subdomain handles SPF/DKIM/MX internally. The visible "From" header can still be `noreply@fishtrippers.com` (root domain) via Lovable's display-from-root setting.
2. **Lovable email infrastructure** — pgmq queue, send log, suppression list, cron processor. Set up once via `setup_email_infra`.
3. **Auth email scaffolder** — creates `/lovable/email/auth/webhook` + 6 React Email templates (signup, magic-link, recovery, invite, email-change, reauthentication). Activates immediately for Lovable Cloud auth flows.
4. **Existing Resend path** for app/transactional emails — currently pinned to `FishTrippers <hello@fishtrippers.com>`. Change the From to `noreply@fishtrippers.com` so it matches the auth emails. Keep Resend in place (booking confirmation to angler + captain, new message alerts, payout-sent, etc. continue to use the existing admin-editable templates in `public.email_templates`).

## Step-by-step

### Step 1 — Set up the email domain (you do this in the dialog)

I open the email-setup dialog. You enter `fishtrippers.com` (Lovable will delegate a subdomain such as `notify.fishtrippers.com`) and add the NS records Lovable shows to your DNS provider. DNS verification can take up to 72 hours but doesn't block the rest of the setup.

### Step 2 — Provision shared email infrastructure

Run `setup_email_infra`. Creates pgmq queues (`auth_emails`, `transactional_emails`), RPC wrappers, send log, suppression list, unsubscribe tokens, and the cron job that drains the queue every 5 seconds. One-time, idempotent.

### Step 3 — Scaffold auth email templates

Run `scaffold_auth_email_templates`. Creates:

- `src/routes/lovable/email/auth/webhook.ts` — the webhook Supabase Auth calls
- `src/lib/email-templates/auth/*.tsx` — 6 React Email templates

I then style those templates to match FishTrippers (logo color, navy header, button color, footer copy) and set the sender to `noreply@fishtrippers.com` with display name `FishTrippers`.

### Step 4 — Unify the From address on the existing Resend path

In `src/lib/email-sender.server.ts`, change the pinned `FROM_ADDRESS` from `FishTrippers <hello@fishtrippers.com>` to `FishTrippers <noreply@fishtrippers.com>`. Every existing transactional email (booking confirmation to angler + captain, new chat message, custom offer received, listing approved/rejected, payout sent, urgent message) instantly inherits the new From — no other code touched.

### Step 5 — Clean up the dead Send Email Hook artifacts

Delete `supabase/functions/auth-email-hook/` and the matching block in `supabase/config.toml`. They were built last turn for an activation path that isn't available on Cloud.

### Step 6 — Verify

1. Trigger a password reset on `/auth` — confirm email arrives from `noreply@fishtrippers.com`.
2. Sign up a fresh user — confirm verification email arrives from same.
3. Trigger a booking confirmation (existing Resend path) — confirm From shows `noreply@fishtrippers.com`.

## Notes / decisions

- **`hello@` vs `noreply@`**: per your message, going with `noreply@fishtrippers.com` across the board. If you'd prefer `hello@` for marketing-style emails and `noreply@` only for auth, say so before we start and I'll split.
- **Email infrastructure conflict with Resend**: Lovable delegates only a subdomain (e.g. `notify.fishtrippers.com`); your root `fishtrippers.com` stays in Resend. No DNS conflict — the two coexist on different subdomains. Visible From can still read `noreply@fishtrippers.com` on both paths.
- **Auth template editing later**: auth templates live in code as `.tsx` files (React Email). You won't edit them from your admin Email Management page — that page continues to govern the Resend-side transactional templates only. If you want a future migration of those transactional emails onto Lovable's path too, that's a follow-up project.
