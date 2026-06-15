import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export interface AdminReviewRow {
  id: string;
  created_at: string;
  rating: number;
  title: string;
  description: string;
  listing_id: string;
  listing_title: string;
  listing_slug: string | null;
  category_slug: string | null;
  learner_id: string;
  learner_display_name: string;
}

export const listAdminReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminReviewRow[]> => {
    await assertAdmin(context.userId);

    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("id, created_at, rating, title, description, listing_id, learner_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
    const learnerIds = Array.from(new Set(rows.map((r) => r.learner_id)));

    const [{ data: journeys }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("journeys")
        .select("id, title, slug, category")
        .in("id", listingIds),
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, first_name, last_name")
        .in("id", learnerIds),
    ]);

    const journeyMap = new Map<
      string,
      { title: string; slug: string | null; category: string | null }
    >();
    for (const j of journeys ?? []) {
      journeyMap.set(j.id, {
        title: j.title,
        slug: j.slug ?? null,
        category: j.category ?? null,
      });
    }

    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      const dn = (p.display_name ?? "").trim();
      const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      nameMap.set(p.id, dn || full || "Learner");
    }

    return rows.map((r) => {
      const j = journeyMap.get(r.listing_id);
      return {
        id: r.id,
        created_at: r.created_at,
        rating: r.rating,
        title: r.title,
        description: r.description,
        listing_id: r.listing_id,
        listing_title: j?.title ?? "Untitled listing",
        listing_slug: j?.slug ?? null,
        category_slug: j?.category ?? null,
        learner_id: r.learner_id,
        learner_display_name: nameMap.get(r.learner_id) ?? "Learner",
      };
    });
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(500),
});

export const updateAdminReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("reviews")
      .update({
        rating: data.rating,
        title: data.title,
        description: data.description,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
