import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const inputSchema = z.object({ slug: z.string().min(1).max(160) });

export const lookupOperatorRedirectBySlug = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof inputSchema>) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: op } = await supabase
      .from("operators")
      .select("location_slug, slug")
      .eq("slug", data.slug.toLowerCase())
      .maybeSingle();
    if (op?.location_slug && op?.slug) {
      return { location: op.location_slug, businessSlug: op.slug };
    }

    const { data: hist } = await supabase
      .from("operator_slug_history")
      .select("operator_id")
      .eq("old_business_slug", data.slug.toLowerCase())
      .maybeSingle();
    if (hist?.operator_id) {
      const { data: current } = await supabase
        .from("operators")
        .select("location_slug, slug")
        .eq("id", hist.operator_id)
        .maybeSingle();
      if (current?.location_slug && current?.slug) {
        return { location: current.location_slug, businessSlug: current.slug };
      }
    }
    return null;
  });
