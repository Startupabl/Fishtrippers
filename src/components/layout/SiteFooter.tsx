import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Facebook, Instagram, Youtube, Music2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { listLivePages } from "@/lib/site-pages.functions";

type Category = "explore" | "resources" | "legal";

const CATEGORY_ORDER: Category[] = ["explore", "resources", "legal"];
const CATEGORY_LABEL: Record<Category, string> = {
  explore: "Explore",
  resources: "Resources",
  legal: "Legal",
};

const SOCIALS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "https://www.facebook.com/fishtrippers", label: "Facebook", icon: Facebook },
  { href: "https://www.instagram.com/fishtrippers", label: "Instagram", icon: Instagram },
  { href: "https://www.youtube.com/@fishtrippers", label: "YouTube", icon: Youtube },
  { href: "https://www.tiktok.com/@fishtrippers", label: "TikTok", icon: Music2 },
];

const linkClass =
  "inline-flex min-h-9 items-center text-sm text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:text-white";

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
    explore: [],
    resources: [],
    legal: [],
  };
  for (const p of pages ?? []) {
    if (p.category in byCategory) byCategory[p.category as Category].push(p);
  }

  return (
    <footer className="mt-16 bg-[#0A0F1A] text-slate-400">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-14">
        <div className="mb-10">
          <Logo size="md" showTagline />
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
                {CATEGORY_LABEL[cat]}
              </h2>
              <ul className="flex flex-col gap-1">
                {(byCategory[cat] ?? []).map((p) => {
                  const href =
                    p.is_external && p.external_url ? p.external_url : `/${p.slug}`;
                  const external = p.is_external && p.external_url;
                  return (
                    <li key={p.id}>
                      <a
                        href={href}
                        className={linkClass}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {p.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Column 4 — Social icons */}
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
              Follow Us
            </h2>
            <ul className="flex flex-wrap gap-3">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-700/60 text-slate-400 transition-colors hover:border-white hover:bg-white hover:text-[#0A0F1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="mt-12 border-t border-slate-800/70 pt-6">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Fishtrippers. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
