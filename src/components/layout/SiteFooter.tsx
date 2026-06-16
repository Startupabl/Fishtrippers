import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, Linkedin, Youtube, Facebook, Music2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { listLivePages } from "@/lib/site-pages.functions";

type Category = "learning_teaching" | "support_safety" | "legal";

const CATEGORY_ORDER: Category[] = ["learning_teaching", "support_safety", "legal"];
const CATEGORY_LABEL: Record<Category, string> = {
  learning_teaching: "Learning & Teaching",
  support_safety: "Support & Safety",
  legal: "Legal",
};

const linkClass =
  "group inline-flex min-h-11 items-center gap-2 px-1 text-base text-foreground transition-colors hover:text-primary hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.853 0 1.265.641 1.265 1.41 0 .858-.546 2.142-.828 3.331-.235.996.499 1.808 1.481 1.808 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.134-4.515 4.34 0 .859.331 1.781.745 2.281a.3.3 0 0 1 .069.288c-.076.316-.245.996-.277 1.135-.044.183-.145.222-.334.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.222-5.19 6.222-1.013 0-1.965-.527-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  );
}

const SOCIALS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "https://www.facebook.com/fishtrippers", label: "Facebook", icon: Facebook },
  { href: "https://www.instagram.com/fishtrippers", label: "Instagram", icon: Instagram },
  { href: "https://www.pinterest.com/fishtrippers/", label: "Pinterest", icon: PinterestIcon },
  { href: "https://www.tiktok.com/@fishtrippers", label: "TikTok", icon: Music2 },
  { href: "https://www.linkedin.com/company/fishtrippers", label: "LinkedIn", icon: Linkedin },
  { href: "https://www.youtube.com/@fishtrippers", label: "YouTube", icon: Youtube },
];

export function SiteFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchPages = useServerFn(listLivePages);
  const { data: pages } = useQuery({
    queryKey: ["site_pages", "live"],
    queryFn: () => fetchPages(),
    staleTime: 5 * 60 * 1000,
  });

  if (pathname.startsWith("/checkout")) return null;

  type LivePage = NonNullable<typeof pages>[number];
  const byCategory: Record<Category, LivePage[]> = {
    learning_teaching: [],
    support_safety: [],
    legal: [],
  };
  for (const p of pages ?? []) {
    if (p.category in byCategory) byCategory[p.category as Category].push(p);
  }

  return (
    <footer className="mt-16 border-t border-border bg-background text-base">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 md:px-8 py-12">
        <Logo size="md" showTagline />

        <nav
          aria-label="Footer"
          className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:flex lg:flex-row lg:justify-between lg:gap-12"
        >
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </h2>
              <ul className="flex flex-col">
                {(byCategory[cat] ?? []).map((p) => (
                  <li key={p.id}>
                    {p.is_external && p.external_url ? (
                      <a
                        href={p.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {p.title}
                      </a>
                    ) : (
                      <Link
                        to="/pages/$slug"
                        params={{ slug: p.slug }}
                        className={linkClass}
                      >
                        {p.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Column 4 — Social / brand */}
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Connect
            </h2>
            <ul className="flex flex-col">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                const isExternal = s.href.startsWith("http");
                const content = (
                  <>
                    <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    {s.label}
                  </>
                );
                return (
                  <li key={s.href}>
                    {isExternal ? (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {content}
                      </a>
                    ) : (
                      <a href={s.href} className={linkClass}>
                        {content}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="border-t border-border/60 pt-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FishTrippers
          </p>
        </div>
      </div>
    </footer>
  );
}
