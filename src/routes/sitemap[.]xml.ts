import { createFileRoute } from "@tanstack/react-router";
import { MENTORS, PATHS } from "@/data/lesson-paths";
import { slugify } from "@/lib/journeys.shared";

const BASE_URL = "https://fishtrippers.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/acceptable-use-policy", changefreq: "monthly", priority: "0.3" },
          { path: "/become-a-mentor", changefreq: "weekly", priority: "0.7" },
          { path: "/become-an-aide", changefreq: "weekly", priority: "0.7" },
          { path: "/cancellation-policy", changefreq: "monthly", priority: "0.3" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/create-listing", changefreq: "monthly", priority: "0.6" },
          { path: "/data-handling", changefreq: "monthly", priority: "0.3" },
          { path: "/first-lesson-guide", changefreq: "monthly", priority: "0.6" },
          { path: "/how-it-works-trippers", changefreq: "weekly", priority: "0.8" },
          { path: "/how-it-works-hosts", changefreq: "weekly", priority: "0.8" },
          { path: "/journey-welcome", changefreq: "weekly", priority: "0.7" },
          { path: "/learner-faqs", changefreq: "monthly", priority: "0.5" },
          { path: "/mentor-agreement", changefreq: "monthly", priority: "0.3" },
          { path: "/mentor-faqs", changefreq: "monthly", priority: "0.5" },
          { path: "/mentor/create-path", changefreq: "weekly", priority: "0.8" },
          { path: "/privacy", changefreq: "monthly", priority: "0.3" },
          { path: "/search", changefreq: "daily", priority: "0.8" },
          { path: "/security", changefreq: "monthly", priority: "0.3" },
          { path: "/terms", changefreq: "monthly", priority: "0.3" },
          { path: "/trust-and-safety", changefreq: "monthly", priority: "0.5" },
        ];

        // Static fixture mentors
        for (const mentor of MENTORS) {
          entries.push({
            path: `/m/${mentor.slug}`,
            changefreq: "weekly",
            priority: "0.6",
          });
        }

        // Static fixture paths
        for (const path of PATHS) {
          entries.push({
            path: `/p/${path.slug}`,
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Live CMS pages
          const { data: pages } = await supabaseAdmin
            .from("site_pages")
            .select("slug, updated_at")
            .eq("status", "live")
            .eq("is_external", false);

          for (const page of pages ?? []) {
            entries.push({
              path: `/pages/${page.slug}`,
              lastmod: page.updated_at ? new Date(page.updated_at).toISOString().split("T")[0] : undefined,
              changefreq: "monthly",
              priority: "0.5",
            });
          }

          // Published + approved journeys
          const { data: journeys } = await supabaseAdmin
            .from("journeys")
            .select("slug, category, updated_at")
            .eq("status", "published")
            .eq("moderation_status", "approved");

          for (const journey of journeys ?? []) {
            const categorySlug = slugify(journey.category ?? "");
            entries.push({
              path: `/c/${categorySlug}/${journey.slug}`,
              lastmod: journey.updated_at ? new Date(journey.updated_at).toISOString().split("T")[0] : undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }

          // Published + approved operators (charters/guides)
          const { data: operators } = await supabaseAdmin
            .from("operators")
            .select("location_slug, slug, updated_at")
            .eq("status", "published")
            .eq("moderation_status", "approved");

          for (const op of operators ?? []) {
            if (!op.location_slug || !op.slug) continue;
            entries.push({
              path: `/charters/${op.location_slug}/${op.slug}`,
              lastmod: op.updated_at ? new Date(op.updated_at).toISOString().split("T")[0] : undefined,
              changefreq: "weekly",
              priority: "0.9",
            });
          }
        } catch (err) {
          console.error("[sitemap] dynamic entries failed:", err);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
