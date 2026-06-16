import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface OperatorListingPayload {
  operator: any | null;
  vessel: any | null;
  boatType: { id: string; subcategory_name: string; icon_url: string | null } | null;
  trips: any[];
  ownerProfile: { full_name: string | null; avatar_url: string | null } | null;
}

export const getMyOperatorListing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperatorListingPayload> => {
    const { supabase, userId } = context;

    const { data: operator, error: opErr } = await supabase
      .from("operators")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (opErr) throw new Error(opErr.message);

    let vessel: any = null;
    let boatType: OperatorListingPayload["boatType"] = null;
    let trips: any[] = [];

    if (operator) {
      const [vRes, tRes] = await Promise.all([
        supabase.from("vessels").select("*").eq("operator_id", operator.id).maybeSingle(),
        supabase
          .from("trip_packages")
          .select("*")
          .eq("operator_id", operator.id)
          .order("created_at", { ascending: true }),
      ]);
      if (vRes.error) throw new Error(vRes.error.message);
      if (tRes.error) throw new Error(tRes.error.message);
      vessel = vRes.data;
      trips = tRes.data ?? [];

      if (vessel?.boat_type_id) {
        const { data: bt } = await supabase
          .from("boat_types" as any)
          .select("id, subcategory_name, icon_url")
          .eq("id", vessel.boat_type_id)
          .maybeSingle();
        if (bt) boatType = bt as any;
      }
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    return {
      operator,
      vessel,
      boatType,
      trips,
      ownerProfile: prof ?? null,
    };
  });
