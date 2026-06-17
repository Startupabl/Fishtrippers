// Admin server functions backing /admin/listings. Targets the operators table
// (the post-pivot listing entity). All handlers gate on has_role(uid,'admin').
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

const ModerationFilterSchema = z
  .enum(["pending", "approved", "declined", "all", "archived"])
  .default("all");

export const listAdminListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ moderation: ModerationFilterSchema }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = (supabaseAdmin.from("operators") as any)
      .select(
        "id, display_name, primary_category, status, moderation_status, created_at, owner_id, listing_number, slug, featured, priority_order, cover_image_url",
      )
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.moderation === "archived") {
      q = q.eq("status", "archived");
    } else {
      q = q.neq("status", "archived");
      if (data.moderation !== "all") q = q.eq("moderation_status", data.moderation);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ownerIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.owner_id as string)),
    );
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, stripe_connect_id, is_payout_ready")
      .in(
        "id",
        ownerIds.length
          ? (ownerIds as string[])
          : ["00000000-0000-0000-0000-000000000000"],
      );
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Map operator rows into the row shape the admin listings table expects.
    return (rows ?? []).map((r: any) => {
      const p = profileMap.get(r.owner_id);
      return {
        id: r.id as string,
        title: (r.display_name ?? "Untitled listing") as string,
        category: (r.primary_category ?? null) as string | null,
        status: r.status as string,
        moderation_status: r.moderation_status as
          | "pending"
          | "approved"
          | "declined",
        created_at: r.created_at as string,
        mentor_id: r.owner_id as string,
        course_id_slug: r.listing_number as string | null,
        slug: r.slug as string | null,
        base_price_minor: 0,
        currency: "USD",
        featured: !!r.featured,
        priority_order: (r.priority_order ?? 0) as number,
        cover_image_url: (r.cover_image_url ?? null) as string | null,
        mentor_email: p?.email ?? null,
        mentor_name:
          [p?.first_name, p?.last_name].filter(Boolean).join(" ") || null,
        mentor_stripe_connect_id: p?.stripe_connect_id ?? null,
        mentor_is_payout_ready: !!p?.is_payout_ready,
      };
    });
  });

export const setListingPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        priority: z.number().int().min(-1000).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("operators") as any)
      .update({ priority_order: data.priority })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true, priority: data.priority };
  });

export const setListingFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid(), featured: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("operators") as any)
      .update({ featured: data.featured })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setListingModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        moderation: z.enum(["pending", "approved", "declined"]),
        note: z.string().trim().min(1).max(2000).optional(),
        reasonKey: z.string().trim().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const updates: Record<string, unknown> = {
      moderation_status: data.moderation,
    };

    if (data.moderation === "declined") {
      updates.status = "draft";
      updates.moderation_note = data.note ?? null;
    } else {
      updates.moderation_note = null;
    }

    if (data.moderation === "approved") {
      const { data: cur } = await (supabaseAdmin.from("operators") as any)
        .select("status, slug, display_name, owner_id")
        .eq("id", data.journeyId)
        .maybeSingle();
      if (cur) {
        // NOTE: Stripe payout-ready check temporarily disabled for design/testing.
        // Re-enable before launch by restoring the is_payout_ready guard below.
        // const { data: owner } = await supabaseAdmin
        //   .from("profiles")
        //   .select("is_payout_ready")
        //   .eq("id", cur.owner_id)
        //   .maybeSingle();
        // if (!owner?.is_payout_ready) {
        //   throw new Error(
        //     "Cannot approve — Captain/Guide has not connected a payout account.",
        //   );
        // }
        if (cur.status !== "published") updates.status = "published";
        if (!cur.slug) {
          const base =
            (cur.display_name ?? "listing")
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 60) || "listing";
          updates.slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
        }
      }
    }

    const { error } = await (supabaseAdmin.from("operators") as any)
      .update(updates)
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("operators") as any)
      .update({ status: "archived" })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("operators") as any)
      .update({ status: "draft", moderation_status: "pending" })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const hardDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("operators")
      .delete()
      .eq("id", data.journeyId);
    if (error) {
      if (
        error.code === "23503" ||
        /foreign key|violates/i.test(error.message)
      ) {
        throw new Error(
          "Cannot permanently delete — this listing has related records. Leave it archived.",
        );
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
