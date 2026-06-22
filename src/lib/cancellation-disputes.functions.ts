import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DisputeStatus = "pending" | "approved" | "denied" | "paid_out";
export type DisputeScope = "active" | "holding" | "ready" | "completed";

export interface CancellationDisputeRow {
  id: string;
  booking_id: string;
  captain_id: string;
  claim_type: "policy_payout" | "other";
  captain_details: string;
  status: DisputeStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  paid_out_at: string | null;
  created_at: string;
  order_number: string | null;
  captain_name: string | null;
  angler_id: string | null;
  angler_name: string | null;
  trip_title: string | null;
  trip_date: string | null;
  angler_written_reason: string | null;
  cancellation_timestamp: string | null;
  cancellation_policy: "flexible" | "moderate" | "strict" | null;
  angler_payout_method: "ach" | "wallet" | "address" | null;
  angler_payout_details: { [k: string]: string | null } | null;
  angler_address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
  angler_email: string | null;
}

export interface DisputeStageCounts {
  active: number;
  holding: number;
  ready: number;
  completed: number;
}

const SubmitInput = z.object({
  bookingId: z.string().uuid(),
  claimType: z.enum(["policy_payout", "other"]),
  details: z.string().trim().min(1).max(250),
});

export const submitCancellationDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmitInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; id: string }> => {
    const { supabase, userId } = context;
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, aide_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking || booking.aide_id !== userId) {
      throw new Error("Booking not found");
    }
    if (booking.status !== "cancelled") {
      throw new Error("Only cancelled bookings can be disputed");
    }
    const { data: inserted, error: iErr } = await supabase
      .from("cancellation_disputes")
      .insert({
        booking_id: data.bookingId,
        captain_id: userId,
        claim_type: data.claimType,
        captain_details: data.details,
      })
      .select("id")
      .single();
    if (iErr) throw new Error(iErr.message);
    return { ok: true, id: inserted.id };
  });

const HOLD_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ListInput = z.object({
  scope: z.enum(["active", "holding", "ready", "completed"]).default("active"),
});

export const listAdminCancellationDisputes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<CancellationDisputeRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await (supabaseAdmin as any)
      .from("cancellation_disputes")
      .select(
        "id, booking_id, captain_id, claim_type, captain_details, status, admin_notes, resolved_at, paid_out_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const cutoffIso = new Date(Date.now() - HOLD_DAYS * MS_PER_DAY).toISOString();
    const filtered = rows.filter((r: any) => {
      switch (data.scope) {
        case "active":
          return r.status === "pending";
        case "holding":
          return (
            r.status === "approved" &&
            !r.paid_out_at &&
            r.resolved_at &&
            r.resolved_at > cutoffIso
          );
        case "ready":
          return (
            r.status === "approved" &&
            !r.paid_out_at &&
            r.resolved_at &&
            r.resolved_at <= cutoffIso
          );
        case "completed":
          return r.status === "paid_out" || r.status === "denied";
      }
    });
    if (filtered.length === 0) return [];

    const bookingIds = Array.from(new Set(filtered.map((r: any) => r.booking_id as string))) as string[];
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, course_id, aide_id, learner_id, primary_angler_name, angler_written_reason, trip_date, cancellation_timestamp",
      )
      .in("id", bookingIds);
    const bById = new Map((bookings ?? []).map((b) => [b.id, b]));

    const tripIds = Array.from(
      new Set((bookings ?? []).map((b) => b.course_id).filter(Boolean) as string[]),
    );
    const { data: trips } = tripIds.length
      ? await supabaseAdmin.from("trip_packages").select("id, title").in("id", tripIds)
      : { data: [] as Array<{ id: string; title: string }> };
    const tById = new Map((trips ?? []).map((t) => [t.id, t]));

    const aideIds = Array.from(
      new Set((bookings ?? []).map((b) => b.aide_id).filter(Boolean) as string[]),
    );
    const { data: operators } = aideIds.length
      ? await supabaseAdmin
          .from("operators")
          .select("owner_id, cancellation_policy")
          .in("owner_id", aideIds)
      : { data: [] as Array<{ owner_id: string; cancellation_policy: string | null }> };
    const policyByOwner = new Map(
      (operators ?? []).map((o: any) => [
        o.owner_id,
        o.cancellation_policy as "flexible" | "moderate" | "strict" | null,
      ]),
    );

    const userIds: string[] = Array.from(
      new Set(
        (bookings ?? []).flatMap((b) =>
          [b.aide_id, b.learner_id].filter(Boolean) as string[],
        ),
      ),
    ) as string[];
    const { data: profiles } = userIds.length
      ? await (supabaseAdmin as any)
          .from("profiles")
          .select(
            "id, first_name, last_name, email, payout_method, payout_details, address_line1, address_line2, city, state_province, postal_code, country",
          )
          .in("id", userIds)
      : { data: [] as any[] };
    const pById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const nameOf = (id?: string | null) => {
      if (!id) return null;
      const p: any = pById.get(id);
      if (!p) return null;
      const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      return n || null;
    };

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("order_number, booking_id")
      .in("booking_id", bookingIds);
    const oByBooking = new Map(
      (orders ?? []).map((o: any) => [o.booking_id, o.order_number as string]),
    );

    return filtered.map((r: any) => {
      const b: any = bById.get(r.booking_id);
      const anglerId = (b?.learner_id as string | undefined) ?? null;
      const anglerProfile: any = anglerId ? pById.get(anglerId) : null;
      return {
        id: r.id,
        booking_id: r.booking_id,
        captain_id: r.captain_id,
        claim_type: r.claim_type as "policy_payout" | "other",
        captain_details: r.captain_details,
        status: r.status as DisputeStatus,
        admin_notes: r.admin_notes,
        resolved_at: r.resolved_at,
        paid_out_at: r.paid_out_at,
        created_at: r.created_at,
        order_number: oByBooking.get(r.booking_id) ?? null,
        captain_name: nameOf(b?.aide_id),
        angler_id: anglerId,
        angler_name: b?.primary_angler_name ?? nameOf(anglerId),
        trip_title: b?.course_id ? tById.get(b.course_id)?.title ?? null : null,
        trip_date: b?.trip_date ?? null,
        angler_written_reason: b?.angler_written_reason ?? null,
        cancellation_timestamp: b?.cancellation_timestamp ?? null,
        cancellation_policy: b?.aide_id ? policyByOwner.get(b.aide_id) ?? null : null,
        angler_payout_method: (anglerProfile?.payout_method as any) ?? null,
        angler_payout_details:
          (anglerProfile?.payout_details as { [k: string]: string | null } | null) ?? null,
        angler_address: anglerProfile
          ? {
              line1: anglerProfile.address_line1 ?? null,
              line2: anglerProfile.address_line2 ?? null,
              city: anglerProfile.city ?? null,
              state_province: anglerProfile.state_province ?? null,
              postal_code: anglerProfile.postal_code ?? null,
              country: anglerProfile.country ?? null,
            }
          : null,
        angler_email: anglerProfile?.email ?? null,
      };
    });
  });

export const getCancellationDisputeStageCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DisputeStageCounts> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("cancellation_disputes")
      .select("status, resolved_at, paid_out_at");
    if (error) throw new Error(error.message);

    const cutoff = Date.now() - HOLD_DAYS * MS_PER_DAY;
    const counts: DisputeStageCounts = { active: 0, holding: 0, ready: 0, completed: 0 };
    for (const r of rows ?? []) {
      if (r.status === "pending") counts.active++;
      else if (r.status === "approved" && !r.paid_out_at) {
        const t = r.resolved_at ? new Date(r.resolved_at).getTime() : Date.now();
        if (t > cutoff) counts.holding++;
        else counts.ready++;
      } else if (r.status === "paid_out" || r.status === "denied") counts.completed++;
    }
    return counts;
  });

const ResolveInput = z.object({
  disputeId: z.string().uuid(),
  decision: z.enum(["approved", "denied"]),
  adminNotes: z.string().trim().max(500).optional(),
});

export const resolveCancellationDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResolveInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("cancellation_disputes")
      .update({
        status: data.decision,
        admin_notes: data.adminNotes ?? null,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.disputeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PayoutInput = z.object({
  disputeId: z.string().uuid(),
});

export const markCancellationDisputePaidOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PayoutInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: rErr } = await (supabaseAdmin as any)
      .from("cancellation_disputes")
      .select("status, resolved_at, paid_out_at, admin_notes")
      .eq("id", data.disputeId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!existing) throw new Error("Dispute not found");
    if (existing.status !== "approved" || existing.paid_out_at) {
      throw new Error("Dispute is not eligible for payout");
    }
    const resolvedAt = existing.resolved_at ? new Date(existing.resolved_at).getTime() : 0;
    if (!resolvedAt || Date.now() - resolvedAt < HOLD_DAYS * MS_PER_DAY) {
      throw new Error("60-day holding period has not elapsed yet");
    }

    const now = new Date().toISOString();
    const note = `Manual payout confirmed by admin ${context.userId} at ${now}`;
    const merged = existing.admin_notes
      ? `${existing.admin_notes}\n${note}`
      : note;
    const { error } = await (supabaseAdmin as any)
      .from("cancellation_disputes")
      .update({
        status: "paid_out",
        paid_out_at: now,
        paid_out_by: context.userId,
        admin_notes: merged,
      })
      .eq("id", data.disputeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
