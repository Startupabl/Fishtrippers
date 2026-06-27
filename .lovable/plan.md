## Goal
Produce a single `migration.sql` file you can paste into the SQL editor of your new Supabase project to recreate the schema (tables, policies, functions, triggers, enums, storage buckets) from this project.

## What I'll include

1. **Extensions** — `pgcrypto`, `unaccent`, `pgmq` (used by the email queue functions).
2. **Enums / custom types** — `app_role`, `user_status_t`, and any other enums referenced by columns.
3. **Tables (45)** — full `CREATE TABLE` for every table currently in `public`:
   alert_templates, blocked_ips, boat_types, booking_slots, bookings, cancellation_disputes, categories, contact_messages, course_certificates, currencies, email_send_log, email_send_state, email_templates, email_unsubscribe_tokens, host_availability, inquiries, ip_history, journey_portfolio_flags, journeys, mentor_availability, message_threads, messages, newsletter_subscribers, operator_photos, operator_slug_history, operators, order_session_completions, orders, platform_settings, platform_stripe_secrets, profiles, promo_codes, reported_listings, reviews, site_pages, support_tickets, suppressed_emails, tag_category_links, tags, trip_packages, trip_sessions, user_alerts, user_favorites, user_roles, verifications, vessels — including defaults, constraints, foreign keys, and indexes.
4. **GRANTs** — explicit grants to `anon`, `authenticated`, `service_role` per current policies.
5. **RLS** — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and every `CREATE POLICY` exactly as currently defined.
6. **Database functions (~40)** — all the `public.*` functions (has_role, handle_new_user, slugify, generate_unique_*, sync_*, enqueue_email, etc.).
7. **Triggers** — assign_*, sync_*, update_updated_at triggers on each table; plus `on_auth_user_created` / `on_auth_user_signed_in` / `on_auth_email_confirmed` triggers on `auth.users` (you'll need to run these as the Postgres superuser in the SQL editor).
8. **Storage buckets** — `INSERT INTO storage.buckets` for: avatars, course-covers, listing-portfolio, category-images, message-attachments, verification-docs, plus their RLS policies on `storage.objects`.
9. **Sequences** — e.g. `course_id_seq` used by `next_course_id_slug()`.

## What it will NOT include
- **Data rows** — schema only. If you also need data (currencies, categories, email_templates, site_pages, alert_templates, platform_settings), tell me and I'll add `INSERT` statements at the end.
- **Secrets / API keys** — you'll re-add `RESEND_API_KEY`, Google Maps keys, etc. on the new project.
- **auth schema definitions** — Supabase provisions these automatically on a fresh project.
- **Edge functions / cron jobs** — none configured here, but the email queue worker is invoked from `/api/public/hooks/cleanup-old-messages` and `/lovable/email/queue/process`; you'll re-wire those externally.

## Deliverable
A single file `/mnt/documents/migration.sql` you can download and paste into the new project's SQL editor. Run it top-to-bottom in one go. I'll also print a short "post-migration checklist" (run `on_auth_*` triggers as superuser, recreate storage buckets if the IDs collide, set env vars).

## Confirm before I generate

1. **Seed data included?** (currencies, categories, email_templates, site_pages, alert_templates, platform_settings) — yes/no.
2. **User data included?** (profiles, operators, journeys, bookings, orders, messages, etc.) — yes/no. If yes, I'll add it as a separate `data.sql` since it has FK ordering concerns and auth.users rows must be migrated separately via Supabase's user-migration endpoint.
