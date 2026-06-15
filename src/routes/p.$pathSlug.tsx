import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPathBySlug } from "@/data/lesson-paths";
import { slugify } from "@/lib/journeys.shared";

/**
 * Legacy listing URL: /p/<slug>
 * Permanently redirects to the SEO-canonical /c/<category-slug>/<listing-slug>.
 * We resolve the category from fixtures first, then from the journeys table.
 */
export const Route = createFileRoute("/p/$pathSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    admin: search.admin === 1 || search.admin === "1" ? 1 : undefined,
  }),
  loaderDeps: ({ search }) => ({ admin: search.admin }),
  loader: async ({ params, deps }) => {
    const listingSlug = params.pathSlug;
    const adminFlag = deps.admin === 1 ? 1 : undefined;

    // Try fixture catalog first (synchronous, no DB hit).
    const fixture = getPathBySlug(listingSlug);
    let categorySlug = "listings";
    if (fixture?.category) {
      categorySlug = slugify(fixture.category) || "listings";
    } else {
      // Fall back to DB lookup for real listings.
      try {
        const { data } = await supabaseAdmin
          .from("journeys")
          .select("category")
          .eq("slug", listingSlug)
          .maybeSingle();
        if (data?.category) {
          categorySlug = slugify(data.category) || "listings";
        }
      } catch {
        // Ignore lookup errors — fall through with default category.
      }
    }

    throw redirect({
      to: "/c/$categorySlug/$listingSlug",
      params: { categorySlug, listingSlug },
      search: adminFlag ? { admin: 1 as const } : undefined,
      statusCode: 301,
    });
  },
});
