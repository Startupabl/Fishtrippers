import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { InfoPage, InfoSection } from "@/lib/content";

/**
 * Render inline markdown-like syntax: **bold** -> <strong>.
 * Keeps the data layer plain text while letting page authors emphasize
 * key terms (e.g. **Aide**, **Course**) without writing JSX.
 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function SectionBody({ section }: { section: InfoSection }) {
  const isLead = section.variant === "lead";
  return (
    <p
      className={
        isLead
          ? "mt-3 text-xl leading-relaxed text-foreground/90 md:text-2xl"
          : "mt-3 text-base leading-relaxed text-muted-foreground"
      }
    >
      {renderInline(section.body)}
    </p>
  );
}

/**
 * Universal renderer for any informational page (legal, FAQs, marketing,
 * trust, company). All editable text is isolated inside
 * <article id="dynamic-content" data-slug="..."> so a future admin panel can
 * inject new content by slug without touching route or layout code.
 */
export function InformationPage({ page, children }: { page: InfoPage; children?: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:py-20">
      <header>
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {page.category}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 text-xl text-foreground/80">{page.headline}</p>
        {page.lastUpdated && (
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {page.lastUpdated}
          </p>
        )}
      </header>

      <article
        id="dynamic-content"
        data-slug={page.slug}
        className="mt-12 space-y-10"
      >
        {children ?? page.sections.map((section, idx) => (
          <section key={section.heading ?? idx}>
            {section.heading && (
              <h2 className="flex items-baseline gap-2 text-xl font-semibold text-foreground md:text-2xl">
                {section.icon && (
                  <span aria-hidden="true" className="text-accent">
                    {section.icon}
                  </span>
                )}
                <span>{section.heading}</span>
              </h2>
            )}
            <SectionBody section={section} />
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-4 space-y-3">
                {section.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 inline-block h-2 w-2 flex-none rounded-full bg-accent"
                    />
                    <p className="text-base leading-relaxed text-muted-foreground">
                      <strong className="font-semibold text-foreground">
                        {b.label}:
                      </strong>{" "}
                      {renderInline(b.body)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {page.cta && (
        <div className="mt-14">
          <Button asChild size="lg" className="rounded-full">
            <Link to={page.cta.to}>{page.cta.label}</Link>
          </Button>
        </div>
      )}

      <div className="mt-12">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
