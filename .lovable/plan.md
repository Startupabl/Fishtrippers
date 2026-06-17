## 1. Smart footer links (column 1: Explore)

Update `src/components/layout/SiteFooter.tsx` so three slugs render with custom behavior instead of the default `<a href="/{slug}">`. All other DB-driven entries keep current rendering.

- **`create-listing`** — render a smart `<Link>`:
  - Signed-out user → `/create-listing` (existing marketing page)
  - Signed-in, no operator listing (uses `useHasActiveListingStatus`) → `/create-listing`
  - Signed-in, has listing → `/dashboard/my-listing`
  - While the auth/listing query is still loading, default to `/create-listing` to avoid a flash.
- **`search`** — render `<Link to="/search">`.
- **`contact`** — render `<Link to="/contact">` (page rebuilt below).

Implementation detail: small helper `renderFooterLink(page)` inside `SiteFooter.tsx` that switches on `page.slug`. Uses TanStack `<Link>` for internal routes (preload, type-safe).

## 2. Contact page redesign (`/contact`)

Replace the current redirect in `src/routes/contact.tsx` with a real route. Fishtrippers-themed (deep navy/ocean accents, matching footer/site palette), responsive, accessible.

**Layout**
- Hero band: H1 "Get in touch", subhead "Questions about a trip, your booking, or hosting on Fishtrippers? We're here to help."
- Two-column section on desktop, stacked on mobile:
  - Left: contact form card
  - Right: info card with response-time note, support email, and social row (reuse footer socials)

**Form fields** (all client + server validated with Zod)
- Name (1–100)
- Email (valid, ≤255)
- Topic (select: General, Booking help, Hosting/Listing, Press, Other)
- Message (10–2000)
- Honeypot field (`website`) to deter bots

**Submission flow**
- New server function `submitContactMessage` in `src/lib/contact.functions.ts`.
- Inserts into a new public table `contact_messages` (see Technical section).
- Shows toast + inline success state ("Thanks — we'll reply within 1 business day.") and resets the form.

**SEO / head()**
- Title: "Contact Fishtrippers — Trip & Hosting Support"
- Description + og:title/og:description.

## 3. Technical section

### DB migration
```sql
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_agent text,
  status text not null default 'new'
);

grant insert on public.contact_messages to anon, authenticated;
grant all on public.contact_messages to service_role;
-- admins can read via has_role('admin') policy
alter table public.contact_messages enable row level security;

create policy "anyone can submit"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

create policy "admins read all"
  on public.contact_messages for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
```

### Files
- **edit** `src/components/layout/SiteFooter.tsx` — smart link rendering for explore slugs; import `useHasActiveListingStatus`, `useAuthStore`, `<Link>`.
- **edit** `src/routes/contact.tsx` — replace redirect with full component + `head()`.
- **new** `src/lib/contact.functions.ts` — `submitContactMessage` server function with Zod validation; uses server publishable Supabase client (anon insert allowed by RLS).
- **new** `supabase/migrations/<ts>_contact_messages.sql` — table + grants + RLS.

### Out of scope
- No admin inbox UI in this pass (data is queryable; UI can come later).
- No email notification (can layer in later via Resend if requested).
- `/create-listing` marketing page content stays as-is (editable via Page Manager).
