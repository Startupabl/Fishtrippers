// Server functions for the negotiated booking flow:
// Aide creates a Custom Offer (price + scheduled slots) -> Learner accepts/declines ->
// Booking Review -> Stripe Checkout -> webhook confirms.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeFeeBreakdown } from "@/lib/fees";
import { getPlatformFeeRate } from "@/lib/platform-fee.server";
import { createCheckoutSession as gwCreateCheckoutSession } from "@/lib/stripe.server";

export interface BookingSlot {
  id: string;
  starts_at: string;
  duration_minutes: number;
}

export interface BookingDetail {
  id: string;
  aide_id: string;
  learner_id: string;
  course_id: string | null;
  thread_id: string;
  total_price: number;
  service_fee_amount: number;
  aide_earnings: number;
  currency: string;
  status: "pending_offer" | "declined" | "pending_payment" | "confirmed";
  created_at: string;
  slots: BookingSlot[];
  course_title: string | null;
  aide_name: string;
  aide_avatar_url: string | null;
  learner_name: string;
  time_zone_label: string | null;
  author_timezone: string | null;
}

const SlotInput = z.object({
  starts_at: z.string().min(10),
  duration_minutes: z.number().int().min(15).max(480).default(45),
});

const CreateOfferInput = z.object({
  thread_id: z.string().uuid(),
  total_price_minor: z.number().int().min(100).max(10_000_00),
  currency: z.string().min(3).max(8),
  time_zone_label: z.string().trim().max(10).nullable().optional(),
  author_timezone: z.string().trim().min(1).max(64).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  mode: z.enum(["new_cohort", "existing_cohort"]),
  // new_cohort
  listing_title: z.string().trim().min(2).max(140).optional(),
  max_seats: z.number().int().min(1).max(50).optional(),
  slots: z.array(SlotInput).min(1).max(20).optional(),
  // existing_cohort
  class_session_id: z.string().uuid().optional(),
});

function buildAdminLabel(opts: {
  title: string;
  firstSlotIso: string;
  learnerName: string;
}): string {
  const d = new Date(opts.firstSlotIso);
  const dow = d.toLocaleDateString("en-US", { weekday: "long" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const startDate = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `[${opts.title}] ${dow}s @ ${time} • Starts ${startDate} (with Learner: ${opts.learnerName})`;
}


export const createCustomOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateOfferInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .select("id, learner_id, mentor_id, journey_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (tErr || !thread) throw new Error("Conversation not found.");
    if (thread.mentor_id !== userId)
      throw new Error("Only the Aide can send a custom offer.");

    let classSessionId: string;

    if (data.mode === "new_cohort") {
      if (!data.listing_title || !data.slots || data.slots.length === 0) {
        throw new Error("Title and at least one session date are required.");
      }
      const slots = [...data.slots].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );

      // learner name for the admin label
      const { data: learner } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, email")
        .eq("id", thread.learner_id)
        .maybeSingle();
      const learnerName =
        learner?.display_name?.trim() ||
        [learner?.first_name, learner?.last_name].filter(Boolean).join(" ").trim() ||
        learner?.email?.split("@")[0] ||
        "Learner";

      const adminLabel = buildAdminLabel({
        title: data.listing_title,
        firstSlotIso: slots[0].starts_at,
        learnerName,
      });

      const { data: cs, error: csErr } = await supabase
        .from("class_sessions")
        .insert({
          aide_id: userId,
          course_id: thread.journey_id,
          listing_title: data.listing_title,
          session_dates_times_array: slots,
          
          max_seats: data.max_seats ?? 1,
          filled_seats: 0,
          admin_label: adminLabel,
          status: "active",
        })
        .select("id")
        .single();
      if (csErr || !cs)
        throw new Error(csErr?.message ?? "Could not create class session.");
      classSessionId = cs.id;
    } else {
      if (!data.class_session_id)
        throw new Error("Pick an existing cohort to link.");
      const { data: cs, error: csErr } = await supabase
        .from("class_sessions")
        .select("id, aide_id, max_seats, filled_seats")
        .eq("id", data.class_session_id)
        .maybeSingle();
      if (csErr || !cs) throw new Error("Cohort not found.");
      if (cs.aide_id !== userId)
        throw new Error("That cohort doesn't belong to you.");
      if (cs.filled_seats >= cs.max_seats)
        throw new Error("That cohort has no seats left.");
      classSessionId = cs.id;
    }

    const feeRate = await getPlatformFeeRate();
    const fees = computeFeeBreakdown(data.total_price_minor, feeRate);


    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        aide_id: userId,
        learner_id: thread.learner_id,
        course_id: thread.journey_id,
        thread_id: thread.id,
        class_session_id: classSessionId,
        total_price: data.total_price_minor,
        service_fee_amount: fees.feeMinor,
        aide_earnings: fees.payoutMinor,
        currency: data.currency.toUpperCase(),
        status: "pending_offer",
      })
      .select("id")
      .single();
    if (bErr || !booking)
      throw new Error(bErr?.message ?? "Could not create offer.");

    const { data: msg, error: mErr } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        sender_id: userId,
        body: "Sent a custom offer",
        attachment_type: "custom_offer",
        booking_id: booking.id,
        time_zone_label: data.time_zone_label || null,
        author_timezone: data.author_timezone || null,
        offer_expires_at: data.expires_at || null,
      })
      .select("id")
      .single();
    if (mErr || !msg)
      throw new Error(mErr?.message ?? "Could not post offer message.");

    return {
      booking_id: booking.id,
      message_id: msg.id,
      class_session_id: classSessionId,
    };
  });

// Lists the current aide's upcoming cohorts that still have seats.
export interface AvailableCohort {
  id: string;
  listing_title: string;
  session_dates_times_array: { starts_at: string; duration_minutes: number }[];
  max_seats: number;
  filled_seats: number;
  admin_label: string | null;
}

export const listAvailableCohorts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailableCohort[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("class_sessions")
      .select(
        "id, listing_title, session_dates_times_array, max_seats, filled_seats, admin_label",
      )
      .eq("aide_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const now = Date.now();
    return (data ?? []).filter((cs: any) => {
      if (cs.filled_seats >= cs.max_seats) return false;
      const arr = (cs.session_dates_times_array ?? []) as { starts_at: string }[];
      if (arr.length === 0) return false;
      // keep cohorts whose latest session is still in the future
      const lastIso = arr.reduce(
        (max, s) => (s.starts_at > max ? s.starts_at : max),
        arr[0].starts_at,
      );
      return new Date(lastIso).getTime() >= now;
    }) as AvailableCohort[];
  });

// Public (anonymous-safe) read of upcoming cohort sessions for a given course.
// Returns one row per cohort (class_session) with its full schedule + cohort
// metadata, so the listing page can render a "Book Seat" CTA per cohort.
// Uses the admin client to bypass class_sessions RLS (which intentionally
// denies anonymous reads); returns only non-sensitive scheduling fields.
export interface PublicUpcomingCohort {
  class_session_id: string;
  cohort_title: string | null;
  price_minor: number | null;
  currency: string | null;
  max_seats: number;
  seats_left: number;
  slots: { starts_at: string; duration_minutes: number }[];
}

const PublicUpcomingCohortsInput = z.object({
  course_id: z.string().uuid(),
});

export const listPublicUpcomingCohorts = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => PublicUpcomingCohortsInput.parse(i))
  .handler(async ({ data }): Promise<PublicUpcomingCohort[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("class_sessions")
      .select(
        "id, cohort_title, price_minor, currency, max_seats, expires_at, is_public_cohort, session_dates_times_array",
      )
      .eq("course_id", data.course_id)
      .eq("status", "active")
      .or("is_public_cohort.eq.true,max_seats.gte.2");
    if (error) throw new Error(error.message);

    // Drop expired cohorts up front.
    const live = (rows ?? []).filter(
      (r) => !r.expires_at || r.expires_at > nowIso,
    );

    // Live confirmed-booking counts per cohort.
    const cohortIds = live.map((r) => r.id);
    const confirmedByCohort = new Map<string, number>();
    if (cohortIds.length > 0) {
      const { data: bookings, error: bErr } = await supabaseAdmin
        .from("bookings")
        .select("class_session_id")
        .in("class_session_id", cohortIds)
        .eq("status", "confirmed");
      if (bErr) throw new Error(bErr.message);
      for (const b of bookings ?? []) {
        if (!b.class_session_id) continue;
        confirmedByCohort.set(
          b.class_session_id,
          (confirmedByCohort.get(b.class_session_id) ?? 0) + 1,
        );
      }
    }

    const now = Date.now();
    const out: PublicUpcomingCohort[] = [];
    for (const cs of live) {
      const confirmed = confirmedByCohort.get(cs.id) ?? 0;
      const seatsLeft = Math.max(0, (cs.max_seats ?? 0) - confirmed);

      const arr = (cs.session_dates_times_array ?? []) as {
        starts_at: string;
        duration_minutes?: number;
      }[];
      const sorted = arr
        .filter((s) => !!s?.starts_at)
        .map((s) => ({
          starts_at: s.starts_at,
          duration_minutes: s.duration_minutes ?? 45,
        }))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      // Exclude the entire cohort once its FIRST session has started — no
      // mid-course enrollment, and cohorts auto-disappear after completion.
      if (sorted.length === 0 || new Date(sorted[0].starts_at).getTime() < now) continue;
      const upcoming = sorted;
      if (upcoming.length === 0) continue;
      out.push({
        class_session_id: cs.id,
        cohort_title: cs.cohort_title ?? null,
        price_minor: cs.price_minor ?? null,
        currency: cs.currency ?? null,
        max_seats: cs.max_seats ?? 1,
        seats_left: seatsLeft,
        slots: upcoming,
      });
    }
    out.sort((a, b) => a.slots[0].starts_at.localeCompare(b.slots[0].starts_at));
    return out.slice(0, 12);
  });


// Look up the schedule for the class session linked to a given booking
// (or order, via its booking_id). Live-classroom join info now comes from
// `getDailyJoinInfo` in `src/lib/classroom.functions.ts`.
export interface ClassSessionInfo {
  class_session_id: string;
  listing_title: string;
  session_dates_times_array: { starts_at: string; duration_minutes: number }[];
  max_seats: number;
  filled_seats: number;
  is_live: boolean;
}

const ClassSessionForOrderInput = z.object({
  order_id: z.string().uuid(),
});

export const getClassSessionForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ClassSessionForOrderInput.parse(i))
  .handler(async ({ data, context }): Promise<ClassSessionInfo | null> => {
    const { supabase, userId } = context;
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, learner_id, mentor_id, booking_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found.");
    if (order.learner_id !== userId && order.mentor_id !== userId)
      throw new Error("Not authorized.");
    if (!order.booking_id) return null;

    const { data: booking } = await supabase
      .from("bookings")
      .select("class_session_id")
      .eq("id", order.booking_id)
      .maybeSingle();
    if (!booking?.class_session_id) return null;

    const { data: cs } = await supabase
      .from("class_sessions")
      .select(
        "id, listing_title, session_dates_times_array, max_seats, filled_seats, is_live",
      )
      .eq("id", booking.class_session_id)
      .maybeSingle();
    if (!cs) return null;
    return {
      class_session_id: cs.id,
      listing_title: cs.listing_title,
      session_dates_times_array: (cs.session_dates_times_array ?? []) as any,
      max_seats: cs.max_seats,
      filled_seats: cs.filled_seats,
      is_live: (cs as any).is_live ?? false,
    };
  });

const ClassSessionIdInput = z.object({ class_session_id: z.string().uuid() });

export const startClassSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ClassSessionIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: cs } = await supabaseAdmin
      .from("class_sessions")
      .select("aide_id")
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (!cs) throw new Error("Class session not found.");
    if (cs.aide_id !== userId)
      throw new Error("Only the Aide can start this session.");
    const { error } = await supabaseAdmin
      .from("class_sessions")
      .update({
        is_live: true,
        live_started_at: new Date().toISOString(),
        live_ended_at: null,
      })
      .eq("id", data.class_session_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endClassSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ClassSessionIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: cs } = await supabaseAdmin
      .from("class_sessions")
      .select("aide_id")
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (!cs) throw new Error("Class session not found.");
    if (cs.aide_id !== userId)
      throw new Error("Only the Aide can end this session.");
    const { error } = await supabaseAdmin
      .from("class_sessions")
      .update({ is_live: false, live_ended_at: new Date().toISOString() })
      .eq("id", data.class_session_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BookingIdInput = z.object({ booking_id: z.string().uuid() });

export interface BookingListItem {
  id: string;
  status: BookingDetail["status"];
  total_price: number;
  currency: string;
  created_at: string;
  course_title: string | null;
  counterparty_name: string;
  counterparty_avatar_url: string | null;
  i_am: "aide" | "learner";
  next_slot_at: string | null;
  slot_count: number;
}

export const listMyBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookingListItem[]> => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("bookings")
      .select(
        "id, aide_id, learner_id, course_id, class_session_id, total_price, currency, status, created_at",
      )
      .or(`learner_id.eq.${userId},aide_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const bookingIds = rows.map((r) => r.id);
    const cohortIds = Array.from(
      new Set(rows.map((r) => r.class_session_id).filter(Boolean) as string[]),
    );
    const courseIds = Array.from(
      new Set(rows.map((r) => r.course_id).filter(Boolean) as string[]),
    );
    const otherIds = Array.from(
      new Set(
        rows.map((r) => (r.aide_id === userId ? r.learner_id : r.aide_id)),
      ),
    );

    const [slotsRes, cohortsRes, journeysRes, profilesRes] = await Promise.all([
      supabase
        .from("booking_slots")
        .select("booking_id, starts_at")
        .in("booking_id", bookingIds)
        .order("starts_at", { ascending: true }),
      cohortIds.length
        ? supabase
            .from("class_sessions")
            .select("id, listing_title, session_dates_times_array")
            .in("id", cohortIds)
        : Promise.resolve({ data: [] as any[] } as const),
      courseIds.length
        ? supabase.from("journeys").select("id, title").in("id", courseIds)
        : Promise.resolve({ data: [] as any[] } as const),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, display_name, email, avatar_url")
        .in("id", otherIds),
    ]);

    const slotsByBooking = new Map<string, { starts_at: string }[]>();
    for (const s of (slotsRes.data ?? []) as any[]) {
      const arr = slotsByBooking.get(s.booking_id) ?? [];
      arr.push({ starts_at: s.starts_at });
      slotsByBooking.set(s.booking_id, arr);
    }
    const cohortById = new Map<string, any>(
      ((cohortsRes.data ?? []) as any[]).map((c) => [c.id, c]),
    );
    const journeyTitle = new Map<string, string>(
      ((journeysRes.data ?? []) as any[]).map((j) => [j.id, j.title]),
    );
    const profileById = new Map<string, any>(
      ((profilesRes.data ?? []) as any[]).map((p) => [p.id, p]),
    );
    const nameOf = (p: any) => {
      if (!p) return "User";
      if (p.display_name?.trim()) return p.display_name.trim();
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      return full || (p.email?.split("@")[0] ?? "User");
    };

    const now = Date.now();
    return rows.map((r) => {
      // Cohort wins over legacy booking_slots when present.
      const cohort = r.class_session_id
        ? cohortById.get(r.class_session_id)
        : null;
      const slots: { starts_at: string }[] = cohort
        ? ((cohort.session_dates_times_array ?? []) as any[]).map((s) => ({
            starts_at: s.starts_at,
          }))
        : (slotsByBooking.get(r.id) ?? []);
      const sortedSlots = [...slots].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
      const upcoming = sortedSlots.find(
        (s) => new Date(s.starts_at).getTime() >= now,
      );
      const otherId = r.aide_id === userId ? r.learner_id : r.aide_id;
      const other = profileById.get(otherId);
      return {
        id: r.id,
        status: r.status,
        total_price: r.total_price,
        currency: r.currency,
        created_at: r.created_at,
        course_title:
          cohort?.listing_title ??
          (r.course_id ? (journeyTitle.get(r.course_id) ?? null) : null),
        counterparty_name: nameOf(other),
        counterparty_avatar_url: other?.avatar_url ?? null,
        i_am: r.aide_id === userId ? "aide" : "learner",
        next_slot_at:
          upcoming?.starts_at ??
          sortedSlots[sortedSlots.length - 1]?.starts_at ??
          null,
        slot_count: sortedSlots.length,
      };
    });
  });

export const getBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BookingIdInput.parse(i))
  .handler(async ({ data, context }): Promise<BookingDetail> => {
    const { supabase, userId } = context;

    const { data: b, error } = await supabase
      .from("bookings")
      .select(
        "id, aide_id, learner_id, course_id, thread_id, class_session_id, total_price, service_fee_amount, aide_earnings, currency, status, created_at",
      )
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found.");
    if (b.aide_id !== userId && b.learner_id !== userId)
      throw new Error("Not authorized.");

    const [slotsRes, journeyRes, aideRes, learnerRes, msgRes, csRes] =
      await Promise.all([
        supabase
          .from("booking_slots")
          .select("id, starts_at, duration_minutes")
          .eq("booking_id", b.id)
          .order("starts_at", { ascending: true }),
        b.course_id
          ? supabase
              .from("journeys")
              .select("title")
              .eq("id", b.course_id)
              .maybeSingle()
          : Promise.resolve({ data: null } as const),
        supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, display_name, email, avatar_url")
          .eq("id", b.aide_id)
          .maybeSingle(),
        supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, display_name, email")
          .eq("id", b.learner_id)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("time_zone_label, author_timezone")
          .eq("booking_id", b.id)
          .eq("attachment_type", "custom_offer")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        b.class_session_id
          ? supabase
              .from("class_sessions")
              .select(
                "listing_title, session_dates_times_array",
              )
              .eq("id", b.class_session_id)
              .maybeSingle()
          : Promise.resolve({ data: null } as const),
      ]);

    const nameOf = (p: any) => {
      if (!p) return "User";
      if (p.display_name?.trim()) return p.display_name.trim();
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      return full || (p.email?.split("@")[0] ?? "User");
    };

    // If this booking is linked to a class session, schedule is authoritative
    // from class_sessions.session_dates_times_array (the cohort "venue").
    const csData = csRes.data as
      | {
          listing_title: string;
          session_dates_times_array: { starts_at: string; duration_minutes: number }[];
        }
      | null;

    const slots: BookingSlot[] = csData
      ? (csData.session_dates_times_array ?? []).map((s, i) => ({
          id: `cs-${i}`,
          starts_at: s.starts_at,
          duration_minutes: s.duration_minutes ?? 45,
        }))
      : ((slotsRes.data ?? []) as BookingSlot[]);

    return {
      ...b,
      slots,
      course_title: csData?.listing_title ?? journeyRes.data?.title ?? null,
      aide_name: nameOf(aideRes.data),
      aide_avatar_url: aideRes.data?.avatar_url ?? null,
      learner_name: nameOf(learnerRes.data),
      time_zone_label:
        (msgRes.data as { time_zone_label?: string | null } | null)
          ?.time_zone_label ?? null,
      author_timezone:
        (msgRes.data as { author_timezone?: string | null } | null)
          ?.author_timezone ?? null,
    } as BookingDetail;
  });

export const declineBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BookingIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: b, error } = await supabase
      .from("bookings")
      .select("id, learner_id, aide_id, thread_id, status")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found.");
    if (b.learner_id !== userId && b.aide_id !== userId)
      throw new Error("Not authorized.");
    if (b.status !== "pending_offer")
      throw new Error("This offer can no longer be changed.");

    const { error: uErr } = await supabase
      .from("bookings")
      .update({ status: "declined" })
      .eq("id", b.id);
    if (uErr) throw new Error(uErr.message);

    if (b.thread_id) {
      await supabase.from("messages").insert({
        thread_id: b.thread_id,
        sender_id: userId,
        body: "Declined the custom offer. Let's chat about adjustments.",
        attachment_type: "none",
      });
    }

    return { ok: true };
  });

export const confirmBookingDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BookingIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: b, error } = await supabase
      .from("bookings")
      .select("id, learner_id, status")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found.");
    if (b.learner_id !== userId) throw new Error("Only the learner can confirm.");
    if (b.status === "pending_offer") {
      const { error: uErr } = await supabase
        .from("bookings")
        .update({ status: "pending_payment" })
        .eq("id", b.id);
      if (uErr) throw new Error(uErr.message);
    }
    return { ok: true };
  });

const CheckoutInput = z.object({
  booking_id: z.string().uuid(),
  promo_code: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i)
    .optional(),
});

export const createBookingCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheckoutInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: b, error } = await supabase
      .from("bookings")
      .select(
        "id, aide_id, learner_id, course_id, total_price, service_fee_amount, aide_earnings, currency, status, stripe_checkout_session_id",
      )
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found.");
    if (b.learner_id !== userId) throw new Error("Not authorized.");
    if (b.status !== "pending_payment" && b.status !== "pending_offer")
      throw new Error("This booking is not available for payment.");

    // Pricing baseline (Option B / inside-out): `total_price` is the gross
    // the learner pays. The platform fee is carved OUT of that gross, so
    // `aide_earnings = total_price − fee`. Promo discounts apply to the gross.
    const feeRate = await getPlatformFeeRate();
    const originalGross = b.total_price;
    let grossMinor = originalGross;
    let promoRowId: string | null = null;

    if (data.promo_code) {
      const { supabaseAdmin: admin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: pRows, error: pErr } = await admin
        .from("promo_codes")
        .select("id, code, discount_type, discount_value, is_active, expires_at, journey_id")
        .eq("journey_id", b.course_id ?? "")
        .ilike("code", data.promo_code.toUpperCase())
        .limit(1);
      if (pErr) throw new Error(pErr.message);
      const p = pRows?.[0];
      if (!p) throw new Error("Promo code is not valid for this course.");
      if (!p.is_active) throw new Error("Promo code is no longer active.");
      if (p.expires_at && new Date(p.expires_at).getTime() < Date.now())
        throw new Error("Promo code has expired.");

      const { applyPromoToSubtotal } = await import("@/lib/promo-codes.functions");
      const { newSubtotalMinor } = applyPromoToSubtotal(originalGross, {
        discount_type: p.discount_type as "percent" | "fixed",
        discount_value: p.discount_value,
      });
      grossMinor = newSubtotalMinor;
      promoRowId = p.id;
    }

    const newFee = Math.round(grossMinor * feeRate);
    const newPayout = grossMinor - newFee;

    if (grossMinor < 100) {
      throw new Error("Discounted total is below the minimum charge amount.");
    }

    // Persist the (possibly discounted) pricing so webhooks and reads agree.
    // Use the admin client because RLS now restricts authenticated UPDATE on
    // bookings to the `status` column only — financial fields are server-trusted.
    const { supabaseAdmin: bookingAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await bookingAdmin
      .from("bookings")
      .update({
        total_price: grossMinor,
        service_fee_amount: newFee,
        aide_earnings: newPayout,
        promo_code_id: promoRowId,
      })
      .eq("id", b.id);

    // Defensive integer guard — Stripe rejects floats in minor-unit fields.
    if (
      !Number.isInteger(grossMinor) ||
      !Number.isInteger(newFee) ||
      !Number.isInteger(newPayout)
    ) {
      throw new Error("Internal pricing error — non-integer minor units.");
    }

    // Aide Connect preflight — must have a connected, payout-ready Stripe account
    // before we can route an application_fee_amount + transfer_data destination.
    const { data: aide } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id, is_payout_ready")
      .eq("id", b.aide_id)
      .maybeSingle();
    if (!aide?.stripe_connect_id || !aide.is_payout_ready) {
      throw new Error(
        "This course is currently updating its payment setup. Please try booking again in a moment.",
      );
    }

    let host = "";
    try {
      host = getRequestHost();
    } catch {}
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = host ? `${proto}://${host}` : "";

    // Deterministic idempotency key. Includes the pricing fingerprint so a
    // genuine price change (e.g. promo applied/removed) naturally produces a
    // fresh Stripe session, while pure double-clicks dedupe.
    const idemBase = `bk_${b.id}_${grossMinor}_${newFee}_${promoRowId ?? "none"}`;

    // Lazy product/price for this booking
    const { createStripeProduct, createStripePrice } = await import("@/lib/stripe.server");
    const product = await createStripeProduct({
      name: `Custom Offer · Booking ${b.id.slice(0, 8)}`,
      metadata: { booking_id: b.id },
      idempotencyKey: `${idemBase}_product`,
    });
    const price = await createStripePrice({
      product: product.id,
      unit_amount: grossMinor,
      currency: b.currency,
      idempotencyKey: `${idemBase}_price`,
    });

    const session = await gwCreateCheckoutSession({
      price: price.id,
      success_url: `${origin}/checkout/success?booking_id=${b.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking-review?bookingId=${b.id}`,
      client_reference_id: userId,
      metadata: {
        booking_id: b.id,
        course_id: b.course_id ?? "",
        parent_id: b.learner_id,
        learner_id: b.learner_id, // backwards-compat alias
        aide_id: b.aide_id,
        promo_code_id: promoRowId ?? "",
      },
      application_fee_amount: newFee,
      transfer_destination: aide.stripe_connect_id,
      idempotencyKey: `${idemBase}_session`,
    });

    await bookingAdmin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id, status: "pending_payment" })
      .eq("id", b.id);

    return { url: session.url, id: session.id };
  });

