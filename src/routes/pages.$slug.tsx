import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { InformationPage } from "@/components/info/InformationPage";
import { INFO_PAGES, type InfoPage } from "@/lib/content";
import { getLivePageBySlug } from "@/lib/site-pages.functions";
import { ContactSupportForm } from "@/components/contact/ContactSupportForm";

export const Route = createFileRoute("/pages/$slug")({
  head: ({ params }) => {
    const fallback = INFO_PAGES[params.slug];
    const title = fallback ? `${fallback.title} — FishTrippers` : "FishTrippers";
    const description = fallback?.description ?? "";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        We couldn't find that information page.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        ← Back to home
      </Link>
    </main>
  ),
  component: PageBySlug,
});

const CATEGORY_LABEL: Record<string, string> = {
  learning_teaching: "Learning & Teaching",
  support_safety: "Support & Safety",
  legal: "Legal",
};

function PageBySlug() {
  const { slug } = Route.useParams();
  const fetchPage = useServerFn(getLivePageBySlug);
  const { data, isLoading } = useQuery({
    queryKey: ["site_pages", "live", slug],
    queryFn: () => fetchPage({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-4 w-2/3 animate-pulse rounded bg-muted" />
      </main>
    );
  }

  // External links: redirect on the client.
  if (data?.is_external && data.external_url) {
    if (typeof window !== "undefined") {
      window.location.replace(data.external_url);
    }
    return null;
  }

  if (data) {
    const page: InfoPage = {
      slug: data.slug,
      title: data.title,
      description: data.description ?? "",
      headline: data.description ?? "",
      category: (CATEGORY_LABEL[data.category] ?? "Company & Contact") as InfoPage["category"],
      sections: [],
    };
    return (
      <InformationPage page={page}>
        {data.content_html ? (
          <div
            className="prose prose-neutral max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary"
            // Content was sanitized server-side on save.
            dangerouslySetInnerHTML={{ __html: data.content_html }}
          />
        ) : null}
        {slug === "contact-support" && <ContactSupportForm />}
      </InformationPage>
    );
  }

  // Fallback to legacy hardcoded content for any slug not yet migrated.
  const legacy = INFO_PAGES[slug];
  if (!legacy) throw notFound();
  return (
    <InformationPage page={legacy}>
      {slug === "contact-support" && <ContactSupportForm />}
    </InformationPage>
  );
}
