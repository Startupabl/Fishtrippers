import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CancellationDisputeRow {
  id: string;
  booking_id: string;
  captain_id: string;
  claim_type: "policy_payout" | "other";
  captain_details: string;
  status: "pending" | "approved" | "denied";
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  order_number: string | null;
  captain_name: string | null;
  angler_name: string | null;
  trip_title: string | null;
  trip_date: string | null;
  angler_written_reason: string | null;
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
    // Verify the captain owns this booking AND it is cancelled.
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

export const listAdminCancellationDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CancellationDisputeRow[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("cancellation_disputes")
      .select(
        "id, booking_id, captain_id, claim_type, captain_details, status, admin_notes, resolved_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const bookingIds = Array.from(new Set(rows.map((r) => r.booking_id)));
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, course_id, aide_id, learner_id, primary_angler_name, angler_written_reason, trip_date",
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

    const userIds = Array.from(
      new Set(
        (bookings ?? []).flatMap((b) =>
          [b.aide_id, b.learner_id].filter(Boolean) as string[],
        ),
      ),
    );
    const { data: profiles } = userIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> };
    const pById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const nameOf = (id?: string | null) => {
      if (!id) return null;
      const p = pById.get(id);
      if (!p) return null;
      const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      return n || null;
    };

    // Orders are keyed by booking_id (best-effort lookup for order_number).
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("order_number, booking_id")
      .in("booking_id", bookingIds);
    const oByBooking = new Map(
      (orders ?? []).map((o: any) => [o.booking_id, o.order_number as string]),
    );

    return rows.map((r) => {
      const b = bById.get(r.booking_id);
      return {
        id: r.id,
        booking_id: r.booking_id,
        captain_id: r.captain_id,
        claim_type: r.claim_type as "policy_payout" | "other",
        captain_details: r.captain_details,
        status: r.status as "pending" | "approved" | "denied",
        admin_notes: r.admin_notes,
        resolved_at: r.resolved_at,
        created_at: r.created_at,
        order_number: oByBooking.get(r.booking_id) ?? null,
        captain_name: nameOf(b?.aide_id),
        angler_name: b?.primary_angler_name ?? nameOf(b?.learner_id ?? null),
        trip_title: b?.course_id ? tById.get(b.course_id)?.title ?? null : null,
        trip_date: b?.trip_date ?? null,
        angler_written_reason: b?.angler_written_reason ?? null,
      };
    });
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
