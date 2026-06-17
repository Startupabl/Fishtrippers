## 1. Database — new footer categories

One migration:
- Rename enum `site_page_category` values: `learning_teaching` → `explore`, `support_safety` → `resources` (`legal` stays).
- Seed 9 `site_pages` rows (all `status='live'`, `is_external=false`) so the footer is fully driven by admin out of the box:

| Category | Title | Slug |
|---|---|---|
| explore | About Fishtrippers | `about` |
| explore | Create a Listing | `create-listing` |
| explore | Search for Trips | `search` |
| resources | How it Works for Trippers | `how-it-works-trippers` |
| resources | How it Works for Hosts | `how-it-works-hosts` |
| resources | Contact Us | `contact` |
| legal | Terms of Service | `terms` |
| legal | Privacy Policy | `privacy` |
| legal | Pricing & Cancellation Policy | `cancellation-policy` |

## 2. Page Manager (admin) — label updates

In `src/lib/site-pages.functions.ts` and `src/routes/_admin/admin.settings.pages.{index,$pageId}.tsx`:
- Swap `CategoryEnum` to `["explore","resources","legal"]`.
- Update `CATEGORY_LABEL` map → `Explore`, `Resources`, `Legal`.

## 3. Footer — `src/components/layout/SiteFooter.tsx`

- Keep dynamic fetch from `listLivePages`.
- New layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10`.
- Columns 1–3: render Explore / Resources / Legal from DB rows (title + slug → `/<slug>` via plain `<a>` since slugs are real top-level routes, not `/pages/$slug`). External rows still honor `external_url`.
- Column 4 — "Follow Us": icon-only grid (Facebook, Instagram, YouTube, TikTok) — rounded square buttons (`size-10 rounded-lg border border-border/40 hover:bg-primary hover:text-primary-foreground`), `aria-label` on each.
- Theme: deep-slate footer (`bg-[#0A0F1A] text-slate-400`), headings `text-white font-semibold uppercase text-xs tracking-wider`, links `text-slate-400 hover:text-white`, thin `border-slate-800/70` separator.
- Bottom bar: left-aligned `© 2026 Fishtrippers. All rights reserved.` (no flex-row jumble), small muted text.

## 4. Routes — rename + create placeholders

Use `mv` for renames, then update `createFileRoute` strings and any internal links:

| Old file | New file | Slug |
|---|---|---|
| `about-us.tsx` | `about.tsx` | `/about` |
| `terms-of-service.tsx` | `terms.tsx` | `/terms` |
| `privacy-policy.tsx` | `privacy.tsx` | `/privacy` |
| `how-it-works.tsx` | `how-it-works-trippers.tsx` | `/how-it-works-trippers` |
| (new) | `how-it-works-hosts.tsx` | `/how-it-works-hosts` |
| (new) | `cancellation-policy.tsx` | `/cancellation-policy` |
| (new) | `create-listing.tsx` | `/create-listing` |

`search.tsx` and `contact.tsx` already exist — leave them untouched.

Update references to the old paths in: `register.tsx`, `_authenticated/booking-review.tsx`, `ProfileCompletionRedirector.tsx`, `sitemap[.]xml.ts`, `pages.$slug.tsx` redirects/fallbacks.

### Placeholder page component

All 7 new/renamed route pages render the same shell that pulls editable copy from `site_pages` by slug (so admin edits flow straight through):

```tsx
// inside component
const { data } = useQuery({ queryKey:['site_pages','live',slug], queryFn: () => fetchPage({data:{slug}}) });
return (
  <main className="mx-auto max-w-3xl px-4 py-16">
    <h1 className="text-4xl font-semibold tracking-tight">{data?.title ?? FALLBACK_TITLE}</h1>
    {data?.description && <p className="mt-3 text-lg text-muted-foreground">{data.description}</p>}
    <div className="mt-10 prose prose-neutral max-w-none"
         dangerouslySetInnerHTML={{ __html: data?.content_html ?? '<p>Content coming soon. Edit this page from Admin → Settings → Pages.</p>' }} />
  </main>
);
```

Each route sets its own `head()` with title + meta description.

## 5. Cleanup

- Keep `pages.$slug.tsx` for any future admin-only ad-hoc pages (legacy fallback).
- Update `sitemap[.]xml.ts` slug list to the new URLs.
- Old `INFO_PAGES` keys in `src/lib/content.ts` updated to match new slugs so the fallback prose stays intact.
