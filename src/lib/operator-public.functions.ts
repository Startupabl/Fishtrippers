import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type PublicOperatorListing =
  | {
      kind: "ok";
      operator: any;
      vessel: any | null;
      boatType: { id: string; subcategory_name: string; icon_url: string | null } | null;
      trips: any[];
      ownerProfile: { full_name: string | null; avatar_url: string | null } | null;
      hostHasAvailability: boolean;
    }
  | { kind: "redirect"; location: string; businessSlug: string }
  | { kind: "not_found" };

const inputSchema = z.object({
  location: z.string().min(1).max(120),
  businessSlug: z.string().min(1).max(160),
});

function makeClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getPublicOperatorListing = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof inputSchema>) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<PublicOperatorListing> => {
    const supabase = makeClient();
    const location = data.location.toLowerCase();
    const businessSlug = data.businessSlug.toLowerCase();

    const { data: operator } = await supabase
      .from("operators")
      .select("*")
      .eq("location_slug", location)
      .eq("slug", businessSlug)
      .eq("moderation_status", "approved")
      .eq("status", "published")
      .maybeSingle();

    if (!operator) {
      // Check redirect history.
      const { data: hist } = await supabase
        .from("operator_slug_history")
        .select("operator_id")
        .eq("old_location_slug", location)
        .eq("old_business_slug", businessSlug)
        .maybeSingle();
      if (hist?.operator_id) {
        const { data: current } = await supabase
          .from("operators")
          .select("location_slug, slug")
          .eq("id", hist.operator_id)
          .maybeSingle();
        if (current?.location_slug && current?.slug) {
          return {
            kind: "redirect",
            location: current.location_slug,
            businessSlug: current.slug,
          };
        }
      }
      return { kind: "not_found" };
    }

    const [vRes, tRes, aRes, pRes] = await Promise.all([
      supabase.from("vessels").select("*").eq("operator_id", operator.id).maybeSingle(),
      supabase
        .from("trip_packages")
        .select("*")
        .eq("operator_id", operator.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase
        .from("host_availability")
        .select("id", { count: "exact", head: true })
        .eq("host_id", operator.id),
      supabase
        .from("profiles")
        .select("first_name, last_name, display_name, avatar_url")
        .eq("id", operator.owner_id)
        .maybeSingle(),
    ]);

    const vessel = vRes.data ?? null;
    let boatType: PublicOperatorListing extends infer T
      ? T extends { kind: "ok"; boatType: infer B }
        ? B
        : never
      : never = null as any;
    if (vessel?.boat_type_id) {
      const { data: bt } = await supabase
        .from("boat_types" as any)
        .select("id, subcategory_name, icon_url")
        .eq("id", vessel.boat_type_id)
        .maybeSingle();
      if (bt) boatType = bt as any;
    }

    const prof = pRes.data;
    const fullName = prof
      ? prof.display_name ||
        [prof.first_name, prof.last_name].filter(Boolean).join(" ") ||
        null
      : null;

    return {
      kind: "ok",
      operator,
      vessel,
      boatType,
      trips: tRes.data ?? [],
      ownerProfile: prof
        ? { full_name: fullName, avatar_url: prof.avatar_url ?? null }
        : null,
      hostHasAvailability: (aRes.count ?? 0) > 0,
    };
  });
