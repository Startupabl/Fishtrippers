import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLivePageBySlug } from "@/lib/site-pages.functions";

interface Props {
  slug: string;
  fallbackTitle: string;
  fallbackDescription?: string;
}

export function SitePageRenderer({ slug, fallbackTitle, fallbackDescription }: Props) {
  const fetchPage = useServerFn(getLivePageBySlug);
  const { data, isLoading } = useQuery({
    queryKey: ["site_pages", "live", slug],
    queryFn: () => fetchPage({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20">
        <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-10 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
        </div>
      </main>
    );
  }

  const title = data?.title ?? fallbackTitle;
  const description = data?.description ?? fallbackDescription ?? "";
  const html =
    data?.content_html ??
    `<p>Content coming soon. This page can be edited from Admin → Settings → Pages.</p>`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      )}
      <div
        className="prose prose-neutral mt-10 max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
