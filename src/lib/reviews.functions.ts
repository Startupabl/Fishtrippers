import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitInput = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(500),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, learner_id, mentor_id, journey_id, order_status")
      .eq("id", data.orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (order.learner_id !== userId) throw new Error("Not your order");
    if (order.order_status !== "completed")
      throw new Error("Course is not completed yet");

    const { error: insertErr } = await supabaseAdmin.from("reviews").insert({
      order_id: order.id,
      listing_id: order.journey_id,
      aide_id: order.mentor_id,
      learner_id: userId,
      rating: data.rating,
      title: data.title,
      description: data.description,
    });

    if (insertErr) {
      if (insertErr.code === "23505")
        throw new Error("You already reviewed this course");
      throw new Error(insertErr.message);
    }

    return { ok: true };
  });

export const getMyReviewedOrderIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("order_id")
      .eq("learner_id", context.userId);
    if (error) return [];
    return (data ?? []).map((r) => r.order_id).filter((id): id is string => !!id);
  });

export type ListingReviewStats = { avg: number; count: number };

export const getListingReviewStats = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ listingIds: z.array(z.string().uuid()) }).parse(input),
  )
  .handler(
    async ({ data }): Promise<Record<string, ListingReviewStats>> => {
      if (data.listingIds.length === 0) return {};
      const { data: rows, error } = await supabaseAdmin
        .from("reviews")
        .select("listing_id, rating")
        .in("listing_id", data.listingIds);
      if (error || !rows) return {};
      const acc: Record<string, { sum: number; count: number }> = {};
      for (const r of rows) {
        const k = r.listing_id as string;
        if (!acc[k]) acc[k] = { sum: 0, count: 0 };
        acc[k].sum += r.rating as number;
        acc[k].count += 1;
      }
      const out: Record<string, ListingReviewStats> = {};
      for (const [k, v] of Object.entries(acc)) {
        out[k] = { avg: v.sum / v.count, count: v.count };
      }
      return out;
    },
  );

export interface ListingReview {
  id: string;
  created_at: string;
  rating: number;
  title: string;
  description: string;
  learner_id: string;
  learner_display_name: string;
}

export const getListingReviews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ listingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<ListingReview[]> => {
    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("id, created_at, rating, title, description, learner_id")
      .eq("listing_id", data.listingId)
      .order("created_at", { ascending: false });
    if (error || !rows) return [];
    const learnerIds = Array.from(new Set(rows.map((r) => r.learner_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name")
      .in("id", learnerIds);
    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      const dn = (p.display_name ?? "").trim();
      const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      nameMap.set(p.id, dn || full || "Learner");
    }
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      rating: r.rating,
      title: r.title,
      description: r.description,
      learner_id: r.learner_id,
      learner_display_name: nameMap.get(r.learner_id) ?? "Learner",
    }));
  });
