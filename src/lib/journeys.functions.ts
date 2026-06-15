// Server functions for the journeys table.
// This file is intentionally a thin wrapper: only createServerFn declarations
// and their imports. All shared helpers live in ./journeys.shared.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { containsForbiddenKeyword } from "@/lib/forbidden-keywords";
import {
  JOURNEY_COLS,
  slugify,
  SearchInput,
  PublishInput,
  DraftInput,
  UpdateInput,
  evaluateEditRisk,
  type JourneyRow,
  type JourneyWithStats,
  type PortfolioAsset,
  type ReviewReason,
} from "./journeys.shared";

// Re-export types so existing imports from "@/lib/journeys.functions" keep working.
export type { JourneyRow, JourneyWithStats, PortfolioAsset };

async function attachMentorInfo(rows: JourneyRow[]): Promise<JourneyRow[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(new Set(rows.map((r) => r.mentor_id).filter(Boolean)));
  if (ids.length === 0) return rows;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, display_name, avatar_url, motto")
    .in("id", ids);
  if (error) {
    console.error("[attachMentorInfo]", error);
    return rows;
  }
  const map = new Map((data ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = map.get(r.mentor_id) as { first_name?: string | null; last_name?: string | null; display_name?: string | null; avatar_url?: string | null; motto?: string | null } | undefined;
    if (!p) return r;
    return {
      ...r,
      mentor_display_name: p.display_name ?? null,
      mentor_first_name: p.first_name ?? null,
      mentor_last_name: p.last_name ?? null,
      mentor_avatar_url: p.avatar_url ?? null,
      mentor_motto: p.motto ?? null,
    };
  });
}

async function attachReviewStats(rows: JourneyRow[]): Promise<JourneyRow[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(new Set(rows.map((r) => r.id)));
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("listing_id, rating")
    .in("listing_id", ids);
  if (error || !data) return rows;
  const acc: Record<string, { sum: number; count: number }> = {};
  for (const r of data) {
    const k = r.listing_id as string;
    if (!acc[k]) acc[k] = { sum: 0, count: 0 };
    acc[k].sum += r.rating as number;
    acc[k].count += 1;
  }
  return rows.map((r) => {
    const s = acc[r.id];
    return s
      ? { ...r, review_avg: s.sum / s.count, review_count: s.count }
      : { ...r, review_avg: 0, review_count: 0 };
  });
}

export const searchJourneysServer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }): Promise<{ items: JourneyRow[]; blocked: boolean }> => {
    const q = data.q.trim();

    if (q && containsForbiddenKeyword(q)) {
      return { items: [], blocked: true };
    }

    let query = supabase
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("status", "published")
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    // Category filter — tolerate legacy rows whose `category` predates the
    // parent/child taxonomy rename (e.g. "Design" vs "AI Design"). We match
    // case-insensitively against the selected name and a short-form alias
    // (selected name with a leading "AI " stripped).
    if (data.category) {
      const cat = data.category.trim();
      const alias = cat.replace(/^AI\s+/i, "").trim();
      const escape = (s: string) => s.replace(/[%_,()]/g, "");
      const parts = [
        `category.ilike.${escape(cat)}`,
        `category.ilike.${escape(alias)}`,
      ];
      query = query.or(parts.join(","));
    }
    // Multi-select tag filter — AND semantics: listing must contain ALL selected tag names.
    if (data.tags && data.tags.length > 0) {
      const escape = (s: string) =>
        s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const arrayLiteral = `{${data.tags.map((t) => `"${escape(t)}"`).join(",")}}`;
      query = query.contains("tags", arrayLiteral);
    }

    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(
        `title.ilike.${like},description.ilike.${like},category.ilike.${like},tags.cs.{${q}}`,
      );
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[searchJourneysServer]", error);
      return { items: [], blocked: false };
    }

    const lower = q.toLowerCase();
    const scored = (rows ?? []).map((r) => {
      let score = 0;
      if (q) {
        if (r.title?.toLowerCase().includes(lower)) score += 100;
        if ((r.tags ?? []).some((t: string) => t.toLowerCase() === lower)) score += 60;
        else if ((r.tags ?? []).some((t: string) => t.toLowerCase().includes(lower))) score += 50;
        if (r.description?.toLowerCase().includes(lower)) score += 30;
        if (r.category?.toLowerCase().includes(lower)) score += 20;
      }
      return { row: r as unknown as JourneyRow, score };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ap = (a.row as { priority_order?: number }).priority_order ?? 0;
      const bp = (b.row as { priority_order?: number }).priority_order ?? 0;
      if (bp !== ap) return bp - ap;
      const ac = new Date((a.row as { created_at?: string }).created_at ?? 0).getTime();
      const bc = new Date((b.row as { created_at?: string }).created_at ?? 0).getTime();
      return bc - ac;
    });

    const items = await attachReviewStats(await attachMentorInfo(scored.map((s) => s.row)));
    return { items, blocked: false };
  });

export const listFeaturedJourneys = createServerFn({ method: "GET" })
  .handler(async (): Promise<JourneyRow[]> => {
    const { data, error } = await supabase
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("featured", true)
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) {
      console.error("[listFeaturedJourneys]", error);
      return [];
    }
    return attachReviewStats(await attachMentorInfo((data ?? []) as unknown as JourneyRow[]));
  });

export const publishJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PublishInput.parse(input))
  .handler(async ({ data, context }) => {
    const fields: string[] = [data.title, data.description, ...data.tags];
    if (data.mentor_bio) fields.push(data.mentor_bio);
    for (const f of fields) {
      if (containsForbiddenKeyword(f)) {
        throw new Error(
          "Your listing contains terms that violate our community safety standards. Please revise your title, description, or tags.",
        );
      }
    }

    const { supabase, userId } = context;

    // Note: payout-account connection is NOT required to submit a listing.
    // Admins enforce `is_payout_ready` at approval time (see admin.functions.ts).

    const base = slugify(data.title) || "journey";
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;

    // Look up the prior row (if any) so we can decide whether this is a
    // first-ever submission (→ pending) or a re-publish of an already-approved
    // listing (→ evaluate edit risk; stays approved unless something flagged).
    type PriorRow = Pick<JourneyRow, "moderation_status" | "base_price_minor" | "category" | "showcase_video_url" | "showcase_audio_url">;
    let priorRow: PriorRow | null = null;
    if (data.id) {
      const { data: existing } = await supabase
        .from("journeys")
        .select("moderation_status, base_price_minor, category, showcase_video_url, showcase_audio_url")
        .eq("id", data.id)
        .eq("mentor_id", userId)
        .maybeSingle();
      if (existing) priorRow = existing as unknown as PriorRow;
    }

    let nextModeration: "pending" | "approved" = "pending";
    let reviewReason: ReviewReason | null = null;
    if (priorRow?.moderation_status === "approved") {
      reviewReason = evaluateEditRisk(priorRow, {
        base_price_minor: data.base_price_minor,
        category: data.category,
        showcase_video_url: data.showcase_video_url ?? null,
        showcase_audio_url: data.showcase_audio_url ?? null,
      });
      nextModeration = reviewReason ? "pending" : "approved";
    }

    const payload = {
      mentor_id: userId,
      title: data.title,
      category: data.category,
      description: data.description,
      tags: data.tags,
      base_price_minor: data.base_price_minor,
      currency: data.currency,
      session_count: data.session_count,
      extra_session_price_minor: data.extra_session_price_minor,
      cover_image_url: data.cover_image_url ?? null,
      capacity: data.capacity,
      session_length_minutes: data.session_length_minutes,
      mentor_bio: data.mentor_bio ?? null,
      session_titles: (data.session_titles ?? []).map((t) => t.trim()).filter(Boolean),
      session_descriptions: (data.session_descriptions ?? []).map((d) => d.trim()),
      experience_level: data.experience_level ?? null,
      showcase_video_url: data.showcase_video_url ?? null,
      showcase_audio_url: data.showcase_audio_url ?? null,
      showcase_images: (data.showcase_images ?? []) as unknown as never,
      featured_image_url: data.featured_image_url ?? null,
      slug,
      status: "published" as const,
      moderation_status: nextModeration,
      // Clear any prior admin rejection feedback on (re)submission so the
      // mentor's banner disappears and the listing returns to the review queue.
      moderation_note: null,
    };


    let resultId: string;
    let resultSlug: string;

    if (data.id) {
      const { data: row, error } = await supabase
        .from("journeys")
        .update(payload)
        .eq("id", data.id)
        .eq("mentor_id", userId)
        .select("id, slug")
        .single();
      if (error) {
        console.error("[publishJourney/promote]", error);
        throw new Error(error.message);
      }
      resultId = row.id;
      resultSlug = row.slug as string;
    } else {
      const { data: row, error } = await supabase
        .from("journeys")
        .insert(payload)
        .select("id, slug")
        .single();

      if (error) {
        console.error("[publishJourney]", error);
        throw new Error(error.message);
      }
      resultId = row.id;
      resultSlug = row.slug as string;
    }

    if (data.apply_bio_to_all && data.mentor_bio !== undefined) {
      const { error: bulkErr } = await supabase
        .from("journeys")
        .update({ mentor_bio: data.mentor_bio ?? null })
        .eq("mentor_id", userId);
      if (bulkErr) console.error("[publishJourney/bulkBio]", bulkErr);
    }

    if (nextModeration === "pending") {
      const message = reviewReason === "link"
        ? `Your showcase link on "${data.title}" is getting a quick safety review.`
        : reviewReason === "critical"
          ? `Your price or category change on "${data.title}" is pending admin review.`
          : `"${data.title}" is pending admin approval.`;
      await supabaseAdmin.from("user_alerts").insert({
        user_id: userId,
        kind: "listing_pending",
        journey_id: resultId,
        message,
      });
    }

    return { id: resultId, slug: resultSlug, moderation_status: nextModeration, review_reason: reviewReason };
  });

export const upsertJourneyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DraftInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const { id, ...fields } = data;

    if (id) {
      const { data: row, error } = await supabase
        .from("journeys")
        .update(fields)
        .eq("id", id)
        .eq("mentor_id", userId)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("[upsertJourneyDraft/update]", error);
        throw new Error(error.message);
      }
      if (row) return { id: row.id };
      throw new Error("Listing not found or not owned by user");
    }


    const { data: row, error } = await supabase
      .from("journeys")
      .insert({
        mentor_id: userId,
        title: fields.title ?? "Untitled draft",
        status: "draft",
        ...fields,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[upsertJourneyDraft/insert]", error);
      throw new Error(error.message);
    }
    return { id: row.id };
  });

export const getJourneyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<JourneyRow | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("id", data.id)
      .eq("mentor_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[getJourneyDraft]", error);
      return null;
    }
    return (row as unknown as JourneyRow) ?? null;
  });

export const updateJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }): Promise<{ row: JourneyRow; review_reason: ReviewReason | null }> => {
    const checkFields: string[] = [
      ...(data.title ? [data.title] : []),
      ...(data.description ? [data.description] : []),
      ...(data.tags ?? []),
      ...(data.mentor_bio ? [data.mentor_bio] : []),
    ];
    for (const f of checkFields) {
      if (containsForbiddenKeyword(f)) {
        throw new Error(
          "Your edits contain terms that violate our community safety standards.",
        );
      }
    }

    const { supabase, userId } = context;
    const { id, apply_bio_to_all, ...updates } = data;

    // Admins can edit any journey; mentors only their own.
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;

    // One-time-approval model: edits to an already-approved listing stay
    // approved unless they introduce risk (untrusted showcase link, price
    // change > 20%, or category swap). Only then do we flip to pending.
    let reviewReason: ReviewReason | null = null;
    if (!isAdmin && Object.keys(updates).length > 0) {
      const { data: cur } = await supabase
        .from("journeys")
        .select("moderation_status, base_price_minor, category, showcase_video_url, showcase_audio_url")
        .eq("id", id)
        .maybeSingle();
      if (cur) {
        reviewReason = evaluateEditRisk(cur as unknown as Pick<JourneyRow, "moderation_status" | "base_price_minor" | "category" | "showcase_video_url" | "showcase_audio_url">, {
          base_price_minor: updates.base_price_minor,
          category: updates.category,
          showcase_video_url: updates.showcase_video_url,
          showcase_audio_url: updates.showcase_audio_url,
        });
        if (reviewReason) {
          (updates as Record<string, unknown>).moderation_status = "pending";
        }
      }
    }

    let q = supabase.from("journeys").update(updates).eq("id", id);
    if (!isAdmin) q = q.eq("mentor_id", userId);
    const { data: row, error } = await q.select(JOURNEY_COLS).single();

    if (error) {
      console.error("[updateJourney]", error);
      throw new Error(error.message);
    }

    if (apply_bio_to_all && updates.mentor_bio !== undefined) {
      const { error: bulkErr } = await supabase
        .from("journeys")
        .update({ mentor_bio: updates.mentor_bio ?? null })
        .eq("mentor_id", userId);
      if (bulkErr) console.error("[updateJourney/bulkBio]", bulkErr);
    }

    if (reviewReason) {
      const title = (row as { title?: string }).title ?? "your listing";
      const message = reviewReason === "link"
        ? `Your showcase link on "${title}" is getting a quick safety review.`
        : `Your price or category change on "${title}" is pending admin review.`;
      await supabaseAdmin.from("user_alerts").insert({
        user_id: userId,
        kind: "listing_pending",
        journey_id: id,
        message,
      });
    }

    return { row: row as unknown as JourneyRow, review_reason: reviewReason };
  });

export const getJourneyBySlug = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }): Promise<JourneyRow | null> => {
    const { data: row, error } = await supabase
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      console.error("[getJourneyBySlug]", error);
      return null;
    }
    return (row as unknown as JourneyRow) ?? null;
  });

export const getMyJourneyBySlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }): Promise<JourneyRow | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("slug", data.slug)
      .eq("mentor_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[getMyJourneyBySlug]", error);
      return null;
    }
    return (row as unknown as JourneyRow) ?? null;
  });

// Admin-only listing lookup. Fetches a journey by slug regardless of status
// or owner so admins can preview pending/draft listings from the Action Queue.
// Gated server-side by has_role(uid, 'admin'); never expose to non-admins.
export const getAdminJourneyBySlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }): Promise<JourneyRow | null> => {
    const { userId } = context;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { data: row, error } = await supabaseAdmin
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error("[getAdminJourneyBySlug]", error);
      return null;
    }
    return (row as unknown as JourneyRow) ?? null;
  });

export const listMyJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JourneyRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("journeys")
      .select(JOURNEY_COLS)
      .eq("mentor_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[listMyJourneys]", error);
      throw new Error(error.message);
    }
    return (data ?? []) as unknown as JourneyRow[];
  });

export const listMyJourneysWithStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JourneyWithStats[]> => {
    const { supabase, userId } = context;
    const [journeysRes, ordersRes] = await Promise.all([
      supabase
        .from("journeys")
        .select(JOURNEY_COLS)
        .eq("mentor_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("journey_id, total_paid_minor, order_status")
        .eq("mentor_id", userId),
    ]);
    if (journeysRes.error) throw new Error(journeysRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const stats = new Map<string, { enrolled: number; earned_minor: number }>();
    for (const o of ordersRes.data ?? []) {
      const cur = stats.get(o.journey_id) ?? { enrolled: 0, earned_minor: 0 };
      cur.earned_minor += o.total_paid_minor ?? 0;
      if (o.order_status === "active") cur.enrolled += 1;
      stats.set(o.journey_id, cur);
    }

    return (journeysRes.data ?? []).map((j) => ({
      row: j as unknown as JourneyRow,
      enrolled: stats.get((j as unknown as JourneyRow).id)?.enrolled ?? 0,
      earned_minor: stats.get((j as unknown as JourneyRow).id)?.earned_minor ?? 0,
    }));
  });

export const archiveJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("journeys")
      .update({ status: "archived" })
      .eq("id", data.id)
      .eq("mentor_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count, error: cErr } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", data.id)
      .eq("mentor_id", userId);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("This Course has students. Archive it instead.");
    }
    const { error } = await supabase
      .from("journeys")
      .delete()
      .eq("id", data.id)
      .eq("mentor_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
