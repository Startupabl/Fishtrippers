import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getHasAideListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ hasListings: boolean }> => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("journeys")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", userId)
      .in("status", ["draft", "published"]);
    if (error) {
      console.error("[getHasAideListings]", error);
      return { hasListings: false };
    }
    return { hasListings: (count ?? 0) > 0 };
  });
