// Server functions for the orders table.
// - createOrder: legacy journey direct-purchase entry point.
// - getOrderByNumber / listMyOrdersLearner / listMyOrdersAide: dashboards.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlatformFeeRate } from "@/lib/platform-fee.server";

const CreateOrderInput = z.object({
  journey_id: z.string().uuid(),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateOrderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Read the journey via the user's RLS-respecting client so we never
    // expose unpublished listings.
    const { data: journey, error: jErr } = await context.supabase
      .from("journeys")
      .select(
        "id, mentor_id, base_price_minor, currency, session_count, status",
      )
      .eq("id", data.journey_id)
      .eq("status", "published")
      .maybeSingle();

    if (jErr || !journey) {
      throw new Error("Course not found or unavailable.");
    }

    // Insert with the service-role client. The Data API INSERT policy on
    // `orders` has been removed so the financial columns cannot be spoofed
    // from the browser — all amounts are derived server-side here from the
    // trusted journey row.
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        learner_id: userId,
        mentor_id: journey.mentor_id,
        journey_id: journey.id,
        total_paid_minor: journey.base_price_minor,
        currency: journey.currency,
        sessions_remaining: journey.session_count,
        order_status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createOrder]", error);
      throw new Error(error.message);
    }
    return { id: order.id };
  });

// SessionSnapshot is the per-session shape persisted on `orders.snapshot_session_titles`
// when the real Stripe webhook records a paid booking. Kept here so dashboard
// reads below can type the column without an extra import.
interface SessionSnapshot {
  [key: string]: string | number;
  session_number: number;
  title: string;
  scheduled_time: string;
}



// ---------------- Mark course complete (upfront tuition) ----------------

const MarkCompleteInput = z.object({ order_id: z.string().uuid() });

export const markOrderComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MarkCompleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select(
        "id, mentor_id, learner_id, snapshot_course_title, snapshot_total_sessions, order_status",
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found.");
    if (order.mentor_id !== userId)
      throw new Error("Only the Aide can mark this course complete.");

    const wasCompleted = order.order_status === "completed";
    if (!wasCompleted) {
      const { error: uErr } = await supabase
        .from("orders")
        .update({ order_status: "completed" })
        .eq("id", data.order_id);
      if (uErr) throw new Error(uErr.message);
    }

    const [{ data: aide }, { data: learner }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("display_name, first_name, last_name, email")
        .eq("id", order.learner_id)
        .maybeSingle(),
    ]);
    const fullName = (p: any) =>
      p?.display_name?.trim() ||
      [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() ||
      p?.email?.split("@")[0] ||
      "";
    const aideName = fullName(aide) || "your Aide";
    const learnerName = fullName(learner) || "Learner";
    const courseTitle = order.snapshot_course_title ?? "your course";
    const totalSessions = order.snapshot_total_sessions ?? 1;

    // Archive the final session row (idempotent).
    await supabaseAdmin
      .from("order_session_completions")
      .upsert(
        {
          order_id: order.id,
          session_index: totalSessions,
          completed_by: userId,
        },
        { onConflict: "order_id,session_index", ignoreDuplicates: true },
      );

    // Issue certificate if not already issued.
    const { data: existingCert } = await supabaseAdmin
      .from("course_certificates")
      .select("cert_number")
      .eq("order_id", order.id)
      .maybeSingle();

    let certNumber = existingCert?.cert_number as string | undefined;
    if (!certNumber) {
      const { data: gen, error: gErr } = await supabaseAdmin.rpc(
        "generate_unique_cert_number",
      );
      if (gErr || !gen) throw new Error(gErr?.message ?? "Cert number failed.");
      certNumber = gen as string;
      const { error: cErr } = await supabaseAdmin
        .from("course_certificates")
        .insert({
          order_id: order.id,
          cert_number: certNumber,
          learner_id: order.learner_id,
          aide_id: userId,
          course_title: courseTitle,
          learner_name: learnerName,
          aide_name: aideName,
        });
      if (cErr) throw new Error(cErr.message);
    }

    if (!wasCompleted) {
      await supabaseAdmin.from("user_alerts").insert({
        user_id: order.learner_id,
        kind: "listing_live",
        message: `🎉 Congratulations on finishing ${courseTitle} with ${aideName}! Your certificate is ready.`,
      });
    }

    return { ok: true, cert_number: certNumber };
  });

// ---------------- Mark a single session complete ----------------

const MarkSessionInput = z.object({
  order_id: z.string().uuid(),
  session_index: z.number().int().min(1).max(100),
});

export const markSessionComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MarkSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, mentor_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found.");
    if (order.mentor_id !== userId)
      throw new Error("Only the Aide can mark sessions complete.");

    const { error } = await supabase
      .from("order_session_completions")
      .upsert(
        {
          order_id: data.order_id,
          session_index: data.session_index,
          completed_by: userId,
        },
        { onConflict: "order_id,session_index", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- List session completions ----------------

const ListCompletionsInput = z.object({
  order_ids: z.array(z.string().uuid()).max(500),
});

export interface SessionCompletion {
  order_id: string;
  session_index: number;
}

export const listSessionCompletions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListCompletionsInput.parse(input))
  .handler(async ({ data, context }): Promise<SessionCompletion[]> => {
    const { supabase } = context;
    if (data.order_ids.length === 0) return [];
    const { data: rows, error } = await supabase
      .from("order_session_completions")
      .select("order_id, session_index")
      .in("order_id", data.order_ids);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SessionCompletion[];
  });

// ---------------- Certificate fetch ----------------

const CertInput = z.object({ order_id: z.string().uuid() });

export interface CourseCertificate {
  cert_number: string;
  course_title: string;
  learner_name: string;
  aide_name: string;
  issued_at: string;
}

export const getCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CertInput.parse(input))
  .handler(async ({ data, context }): Promise<CourseCertificate | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("course_certificates")
      .select("cert_number, course_title, learner_name, aide_name, issued_at")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as CourseCertificate | null) ?? null;
  });

// ---------------- Dashboards ----------------

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_paid_minor: number;
  platform_fee_minor: number;
  aide_payout_minor: number;
  currency: string;
  scheduled_time: string | null;
  snapshot_course_title: string | null;
  snapshot_session_titles: SessionSnapshot[];
  snapshot_total_sessions: number | null;
  snapshot_session_duration: number | null;
  created_at: string;
  journey_id: string | null;
  booking_id: string | null;
  // joined display fields
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url: string | null;
  cover_image_url: string | null;
  thread_id: string | null;
  mentor_timezone: string | null;
  viewer_role: "learner" | "aide";
  total_sessions: number;
}

function nameOf(p: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!p) return "User";
  if (p.display_name && p.display_name.trim()) return p.display_name.trim();
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || (p.email?.split("@")[0] ?? "User");
}

async function enrichOrders(
  supabase: any,
  rows: any[],
  viewerId: string,
  viewerRole: "learner" | "aide",
): Promise<OrderSummary[]> {
  if (rows.length === 0) return [];
  const counterpartyIds = Array.from(
    new Set(rows.map((r) => (viewerRole === "learner" ? r.mentor_id : r.learner_id))),
  );
  const journeyIds = Array.from(
    new Set(rows.map((r) => r.journey_id).filter(Boolean) as string[]),
  );
  const bookingIds = Array.from(
    new Set(rows.map((r) => r.booking_id).filter(Boolean) as string[]),
  );
  // For aide view we also need the viewer's (aide's) own timezone.
  const aideIds = Array.from(new Set(rows.map((r) => r.mentor_id)));

  const [profilesRes, journeysRes, bookingsRes, aideProfilesRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, display_name, email, avatar_url, timezone")
      .in("id", counterpartyIds),
    journeyIds.length
      ? supabase
          .from("journeys")
          .select("id, cover_image_url")
          .in("id", journeyIds)
      : Promise.resolve({ data: [] as any[] }),
    bookingIds.length
      ? supabase
          .from("bookings")
          .select("id, thread_id, trip_session_id")
          .in("id", bookingIds)
      : Promise.resolve({ data: [] as any[] }),
    viewerRole === "aide"
      ? supabaseAdmin.from("profiles").select("id, timezone").in("id", aideIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const tripSessionIds = Array.from(
    new Set(
      ((bookingsRes.data ?? []) as any[])
        .map((b) => b.trip_session_id)
        .filter(Boolean) as string[],
    ),
  );
  const tripSessionsRes = tripSessionIds.length
    ? await supabaseAdmin
        .from("trip_sessions")
        .select("id, session_dates_times_array")
        .in("id", tripSessionIds)
    : { data: [] as any[] };

  const profileById = new Map<string, any>(
    ((profilesRes.data ?? []) as any[]).map((p) => [p.id, p]),
  );
  const coverByJourney = new Map<string, string | null>(
    ((journeysRes.data ?? []) as any[]).map((j) => [j.id, j.cover_image_url]),
  );
  const bookingMap = new Map<string, any>(
    ((bookingsRes.data ?? []) as any[]).map((b) => [b.id, b]),
  );
  const threadByBooking = new Map<string, string | null>(
    ((bookingsRes.data ?? []) as any[]).map((b) => [b.id, b.thread_id]),
  );
  const tripSessionCountById = new Map<string, number>(
    ((tripSessionsRes.data ?? []) as any[]).map((c) => [
      c.id,
      Array.isArray(c.session_dates_times_array)
        ? c.session_dates_times_array.length
        : 0,
    ]),
  );
  const aideTzById = new Map<string, string | null>(
    ((aideProfilesRes.data ?? []) as any[]).map((p) => [p.id, p.timezone ?? null]),
  );

  return rows.map((r) => {
    const counterpartyId = viewerRole === "learner" ? r.mentor_id : r.learner_id;
    const p = profileById.get(counterpartyId);
    const aideTz =
      viewerRole === "learner"
        ? p?.timezone ?? null
        : aideTzById.get(r.mentor_id) ?? null;
    return {
      id: r.id,
      order_number: r.order_number,
      status: r.order_status,
      total_paid_minor: r.total_paid_minor,
      platform_fee_minor: r.platform_fee_minor ?? 0,
      aide_payout_minor: r.aide_payout_minor ?? 0,
      currency: r.snapshot_currency ?? r.currency,
      scheduled_time: r.scheduled_time,
      snapshot_course_title: r.snapshot_course_title,
      snapshot_session_titles: (r.snapshot_session_titles ?? []) as SessionSnapshot[],
      snapshot_total_sessions: r.snapshot_total_sessions,
      snapshot_session_duration: r.snapshot_session_duration,
      created_at: r.created_at,
      journey_id: r.journey_id,
      booking_id: r.booking_id,
      counterparty_id: counterpartyId,
      counterparty_name: nameOf(p),
      counterparty_avatar_url: p?.avatar_url ?? null,
      cover_image_url: r.journey_id ? coverByJourney.get(r.journey_id) ?? null : null,
      thread_id: r.booking_id ? threadByBooking.get(r.booking_id) ?? null : null,
      mentor_timezone: aideTz,
      viewer_role: viewerRole,
      total_sessions:
        (r.booking_id
          ? tripSessionCountById.get(bookingMap.get(r.booking_id)?.trip_session_id) ?? 0
          : 0) ||
        (Array.isArray(r.snapshot_session_titles)
          ? r.snapshot_session_titles.length
          : 0) ||
        r.snapshot_total_sessions ||
        1,
    };
  });
}

const ORDER_SELECT =
  "id, order_number, order_status, total_paid_minor, platform_fee_minor, aide_payout_minor, currency, snapshot_currency, scheduled_time, snapshot_course_title, snapshot_session_titles, snapshot_total_sessions, snapshot_session_duration, created_at, journey_id, booking_id, learner_id, mentor_id";

export const listMyOrdersLearner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderSummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("learner_id", userId)
      .order("scheduled_time", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return enrichOrders(supabase, data ?? [], userId, "learner");
  });

export const listMyOrdersAide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderSummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("mentor_id", userId)
      .order("scheduled_time", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return enrichOrders(supabase, data ?? [], userId, "aide");
  });

const OrderNumberInput = z.object({
  order_number: z.string().min(4).max(32),
});

export const getOrderByNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OrderNumberInput.parse(input))
  .handler(async ({ data, context }): Promise<OrderSummary> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("order_number", data.order_number)
      .maybeSingle();
    if (error || !row) throw new Error("Order not found.");
    if (row.learner_id !== userId && row.mentor_id !== userId)
      throw new Error("Not authorized.");
    const viewerRole = row.learner_id === userId ? "learner" : "aide";
    const [enriched] = await enrichOrders(supabase, [row], userId, viewerRole);
    return enriched;
  });
