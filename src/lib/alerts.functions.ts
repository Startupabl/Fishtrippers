import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface UserAlertRow {
  id: string;
  kind:
    | "listing_pending"
    | "listing_live"
    | "listing_declined"
    | "booking_confirmed"
    | "booking_received"
    | "custom_offer_received"
    | "reschedule_requested"
    | "reschedule_accepted"
    | "reschedule_declined"
    | "trip_cancelled_by_angler";
  journey_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const listMyAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserAlertRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_alerts")
      .select("id, kind, journey_id, message, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[listMyAlerts]", error);
      return [];
    }
    return (data ?? []) as UserAlertRow[];
  });

export const getUnreadAlertCount = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ count: number }> => {
    // Optional auth: tolerate logged-out / pre-hydration calls so we never
    // throw a Response (which surfaces as a global runtime error).
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const { createClient } = await import("@supabase/supabase-js");
      const req = getRequest();
      const auth = req?.headers?.get("authorization");
      if (!auth?.startsWith("Bearer ")) return { count: 0 };
      const token = auth.slice(7);
      if (!token) return { count: 0 };
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return { count: 0 };
      const supabase = createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: claims } = await supabase.auth.getClaims(token);
      const userId = claims?.claims?.sub;
      if (!userId) return { count: 0 };
      const { count } = await supabase
        .from("user_alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      return { count: count ?? 0 };
    } catch (e) {
      console.error("[getUnreadAlertCount]", e);
      return { count: 0 };
    }
  });

export const markAlertRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

export const markAllAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    return { ok: true };
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_alerts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

export interface UnseenLiveListing {
  alertId: string;
  journeyId: string;
  title: string;
  slug: string | null;
  courseIdSlug: string;
}

export const getUnseenLiveListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UnseenLiveListing[]> => {
    const { supabase, userId } = context;
    const { data: alerts, error } = await supabase
      .from("user_alerts")
      .select("id, journey_id, created_at")
      .eq("user_id", userId)
      .eq("kind", "listing_live")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !alerts?.length) return [];
    const ids = alerts.map((a) => a.journey_id).filter(Boolean) as string[];
    if (!ids.length) return [];
    const { data: journeys } = await supabase
      .from("journeys")
      .select("id, title, slug, course_id_slug, moderation_status")
      .in("id", ids);
    const byId = new Map((journeys ?? []).map((j) => [j.id, j]));
    return alerts
      .map((a) => {
        const j = a.journey_id ? byId.get(a.journey_id) : null;
        if (!j || j.moderation_status !== "approved") return null;
        return {
          alertId: a.id,
          journeyId: j.id,
          title: j.title,
          slug: j.slug,
          courseIdSlug: j.course_id_slug,
        } satisfies UnseenLiveListing;
      })
      .filter((x): x is UnseenLiveListing => x !== null);
  });
