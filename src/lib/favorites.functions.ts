import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { JOURNEY_COLS, type JourneyRow } from "./journeys.shared";

export const listMyFavoriteIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_favorites")
      .select("journey_id")
      .eq("user_id", userId);
    if (error) {
      console.error("[listMyFavoriteIds]", error);
      return [];
    }
    return (data ?? []).map((r) => r.journey_id as string);
  });

export const listMyFavoriteJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JourneyRow[]> => {
    const { supabase, userId } = context;
    const { data: favRows, error: favErr } = await supabase
      .from("user_favorites")
      .select("journey_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (favErr) {
      console.error("[listMyFavoriteJourneys] favorites", favErr);
      return [];
    }
    const ids = (favRows ?? []).map((r) => r.journey_id as string);
    if (ids.length === 0) return [];

    const { data: journeys, error: jErr } = await supabaseAdmin
      .from("journeys")
      .select(JOURNEY_COLS)
      .in("id", ids)
      .eq("status", "published")
      .eq("moderation_status", "approved");
    if (jErr) {
      console.error("[listMyFavoriteJourneys] journeys", jErr);
      return [];
    }

    const rows = (journeys ?? []) as unknown as JourneyRow[];
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    // Attach mentor info inline (mirrors journeys.functions attachMentorInfo).
    const mentorIds = Array.from(new Set(rows.map((r) => r.mentor_id).filter(Boolean)));
    if (mentorIds.length === 0) return rows;
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, display_name, avatar_url")
      .in("id", mentorIds);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => {
      const p = pmap.get(r.mentor_id) as
        | { first_name?: string | null; last_name?: string | null; display_name?: string | null; avatar_url?: string | null }
        | undefined;
      if (!p) return r;
      return {
        ...r,
        mentor_display_name: p.display_name ?? null,
        mentor_first_name: p.first_name ?? null,
        mentor_last_name: p.last_name ?? null,
        mentor_avatar_url: p.avatar_url ?? null,
      };
    });
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ journey_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_favorites")
      .upsert({ user_id: userId, journey_id: data.journey_id }, { onConflict: "user_id,journey_id" });
    if (error) {
      console.error("[addFavorite]", error);
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ journey_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("journey_id", data.journey_id);
    if (error) {
      console.error("[removeFavorite]", error);
      throw new Error(error.message);
    }
    return { ok: true };
  });
