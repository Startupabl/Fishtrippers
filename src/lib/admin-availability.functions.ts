// Admin: Calendar Availability & Hold Logs
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

export type AvailabilityRow = {
  id: string;
  status: "booked" | "blocked" | "held";
  date: string;
  captainName: string;
  captainTimezone: string | null;
  tripType: string;
  tripDateTimeISO: string | null;
  blockReason: string;
  offerExpiresAt: string | null;
  bookingId: string | null;
};

export const listAvailabilityHolds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailabilityRow[]> => {
    await assertAdmin(context.userId);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const { data: holds, error } = await supabaseAdmin
      .from("host_availability")
      .select("id,status,date,host_id,booking_id")
      .gte("date", todayStr)
      .in("status", ["booked", "blocked", "held"])
      .order("date", { ascending: true });
    if (error) throw error;
    if (!holds || holds.length === 0) return [];

    const operatorIds = Array.from(new Set(holds.map((h) => h.host_id)));
    const bookingIds = Array.from(
      new Set(holds.map((h) => h.booking_id).filter((x): x is string => !!x)),
    );

    const { data: operators } = await supabaseAdmin
      .from("operators")
      .select("id,owner_id,display_name")
      .in("id", operatorIds);
    const opMap = new Map((operators ?? []).map((o) => [o.id, o]));

    const ownerIds = Array.from(
      new Set((operators ?? []).map((o) => o.owner_id).filter((x): x is string => !!x)),
    );
    const { data: ownerProfiles } = ownerIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id,first_name,last_name,display_name,timezone")
          .in("id", ownerIds)
      : { data: [] as any[] };
    const ownerMap = new Map((ownerProfiles ?? []).map((p) => [p.id, p]));

    let bookingMap = new Map<string, any>();
    let learnerMap = new Map<string, any>();
    let tripMap = new Map<string, any>();
    let sessionMap = new Map<string, any>();
    let offerMap = new Map<string, string>(); // booking_id -> latest offer_expires_at

    if (bookingIds.length) {
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("id,course_id,trip_session_id,learner_id,trip_date")
        .in("id", bookingIds);
      bookingMap = new Map((bookings ?? []).map((b) => [b.id, b]));

      const learnerIds = Array.from(
        new Set((bookings ?? []).map((b) => b.learner_id).filter((x): x is string => !!x)),
      );
      if (learnerIds.length) {
        const { data: learners } = await supabaseAdmin
          .from("profiles")
          .select("id,first_name,last_name,display_name")
          .in("id", learnerIds);
        learnerMap = new Map((learners ?? []).map((p) => [p.id, p]));
      }

      const courseIds = Array.from(
        new Set((bookings ?? []).map((b) => b.course_id).filter((x): x is string => !!x)),
      );
      if (courseIds.length) {
        const { data: trips } = await supabaseAdmin
          .from("trip_packages")
          .select("id,title")
          .in("id", courseIds);
        tripMap = new Map((trips ?? []).map((t) => [t.id, t]));
      }

      const sessionIds = Array.from(
        new Set(
          (bookings ?? []).map((b) => b.trip_session_id).filter((x): x is string => !!x),
        ),
      );
      if (sessionIds.length) {
        const { data: sessions } = await supabaseAdmin
          .from("trip_sessions")
          .select("id,session_dates_times_array,listing_title")
          .in("id", sessionIds);
        sessionMap = new Map((sessions ?? []).map((s) => [s.id, s]));
      }

      // Pull latest custom-offer expirations per booking
      const { data: msgs } = await supabaseAdmin
        .from("messages")
        .select("booking_id,offer_expires_at,created_at")
        .in("booking_id", bookingIds)
        .eq("attachment_type", "custom_offer")
        .order("created_at", { ascending: false });
      for (const m of msgs ?? []) {
        if (m.booking_id && m.offer_expires_at && !offerMap.has(m.booking_id)) {
          offerMap.set(m.booking_id, m.offer_expires_at as string);
        }
      }
    }

    const nowMs = Date.now();
    const rows: AvailabilityRow[] = [];

    for (const h of holds) {
      const op = opMap.get(h.host_id);
      const owner = op ? ownerMap.get(op.owner_id) : null;
      const captainName =
        (owner?.display_name as string | undefined) ||
        [owner?.first_name, owner?.last_name].filter(Boolean).join(" ") ||
        (op?.display_name as string | undefined) ||
        "Unknown Captain";

      const booking = h.booking_id ? bookingMap.get(h.booking_id) : null;
      const trip = booking?.course_id ? tripMap.get(booking.course_id) : null;
      const session = booking?.trip_session_id ? sessionMap.get(booking.trip_session_id) : null;
      const learner = booking?.learner_id ? learnerMap.get(booking.learner_id) : null;
      const learnerName =
        (learner?.display_name as string | undefined) ||
        [learner?.first_name, learner?.last_name].filter(Boolean).join(" ") ||
        "the angler";

      const tripType = trip?.title || session?.listing_title || (booking ? "Custom Trip" : "Manual Block");

      // Trip date/time ISO
      let tripDateTimeISO: string | null = null;
      const firstSession = Array.isArray(session?.session_dates_times_array)
        ? (session.session_dates_times_array[0] as any)
        : null;
      if (firstSession?.start) tripDateTimeISO = firstSession.start as string;
      else if (firstSession?.date && firstSession?.time)
        tripDateTimeISO = `${firstSession.date}T${firstSession.time}`;
      else if (booking?.trip_date) tripDateTimeISO = `${booking.trip_date}T09:00:00`;
      else tripDateTimeISO = `${h.date}T09:00:00`;

      const shortId = h.booking_id ? h.booking_id.slice(0, 8).toUpperCase() : "";
      const offerExpiresAt = h.booking_id ? offerMap.get(h.booking_id) ?? null : null;

      // Filter: skip HELD rows whose offer has already expired (cleaned by cron)
      if (h.status === "held" && offerExpiresAt && new Date(offerExpiresAt).getTime() < nowMs) {
        continue;
      }

      let blockReason: string;
      if (h.status === "held") {
        blockReason = booking?.course_id
          ? `Pending Payment – Booking #${shortId}`
          : `Custom Trip Sent to ${learnerName}`;
      } else if (h.status === "booked") {
        blockReason = `Direct Booking #${shortId}`;
      } else {
        blockReason = "Manual Block";
      }

      rows.push({
        id: h.id,
        status: h.status as AvailabilityRow["status"],
        date: h.date,
        captainName,
        captainTimezone: ((owner as any)?.timezone as string | null) ?? null,
        tripType,
        tripDateTimeISO,
        blockReason,
        offerExpiresAt,
        bookingId: h.booking_id ?? null,
      });
    }

    return rows;
  });

export const releaseAvailabilityHold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("host_availability")
      .select("id,status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!row) throw new Error("Hold not found");
    if (row.status !== "held") throw new Error("Only HELD records can be released");
    const { error: delErr } = await supabaseAdmin
      .from("host_availability")
      .delete()
      .eq("id", data.id);
    if (delErr) throw delErr;
    return { ok: true };
  });
