// Server functions for the negotiated booking flow:
// Guide creates a Custom Trip (price + scheduled slot + meeting point) -> Angler accepts/declines ->
// Booking Review -> Stripe Checkout -> webhook confirms.
//
// Custom trips are stored as a `trip_sessions` row that holds the meeting
// point and schedule for the trip; the linked `bookings` row references it
// via `trip_session_id`.

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
  status: "pending_offer" | "declined" | "pending_payment" | "confirmed" | "completed" | "cancelled";
  created_at: string;
  slots: BookingSlot[];
  course_title: string | null;
  aide_name: string;
  aide_avatar_url: string | null;
  learner_name: string;
  time_zone_label: string | null;
  author_timezone: string | null;
}

const CreateOfferInput = z.object({
  thread_id: z.string().uuid(),
  title: z.string().trim().min(3).max(140),
  duration_minutes: z.number().int().min(30).max(14 * 60),
  total_anglers: z.number().int().min(1).max(50),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  starts_at: z.string().min(10),
  meeting_point_address: z.string().trim().min(2).max(500),
  meeting_point_lat: z.number().nullable().optional(),
  meeting_point_lng: z.number().nullable().optional(),
  meeting_point_place_id: z.string().nullable().optional(),
  currency: z.string().min(3).max(8),
  total_price_minor: z.number().int().min(100).max(10_000_00),
  deposit_minor: z.number().int().min(100).max(10_000_00),
  time_zone_label: z.string().trim().max(10).nullable().optional(),
  author_timezone: z.string().trim().min(1).max(64).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const createCustomOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateOfferInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.deposit_minor > data.total_price_minor) {
      throw new Error("Deposit cannot exceed the total price.");
    }

    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .select("id, learner_id, mentor_id, journey_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (tErr || !thread) throw new Error("Conversation not found.");
    if (thread.mentor_id !== userId)
      throw new Error("Only the guide can send a custom trip.");

    const { data: guide } = await supabase
      .from("profiles")
      .select("first_name, last_name, display_name, email")
      .eq("id", userId)
      .maybeSingle();
    const guideName =
      guide?.display_name?.trim() ||
      [guide?.first_name, guide?.last_name].filter(Boolean).join(" ").trim() ||
      guide?.email?.split("@")[0] ||
      "Your guide";

    const { data: ts, error: tsErr } = await supabase
      .from("trip_sessions")
      .insert({
        aide_id: userId,
        course_id: thread.journey_id,
        listing_title: data.title,
        session_dates_times_array: [
          {
            starts_at: data.starts_at,
            duration_minutes: data.duration_minutes,
          },
        ],
        status: "active",
        meeting_point_address: data.meeting_point_address,
        meeting_point_lat: data.meeting_point_lat ?? null,
        meeting_point_lng: data.meeting_point_lng ?? null,
        meeting_point_place_id: data.meeting_point_place_id ?? null,
      } as never)
      .select("id")
      .single();
    if (tsErr || !ts)
      throw new Error(tsErr?.message ?? "Could not create custom trip.");
    const tripSessionId = ts.id;

    // The deposit is what the angler actually pays at checkout — fees are
    // computed off the deposit so the existing checkout flow charges the
    // right amount.
    const feeRate = await getPlatformFeeRate();
    const fees = computeFeeBreakdown(data.deposit_minor, feeRate);
    const balanceDueMinor = data.total_price_minor - data.deposit_minor;

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        aide_id: userId,
        learner_id: thread.learner_id,
        course_id: thread.journey_id,
        thread_id: thread.id,
        trip_session_id: tripSessionId,
        total_price: data.deposit_minor,
        deposit_minor: data.deposit_minor,
        balance_due_minor: balanceDueMinor,
        service_fee_amount: fees.feeMinor,
        aide_earnings: fees.payoutMinor,
        currency: data.currency.toUpperCase(),
        status: "pending_offer",
        trip_date: data.trip_date,
        guests: data.total_anglers,
      } as never)
      .select("id")
      .single();
    if (bErr || !booking)
      throw new Error(bErr?.message ?? "Could not create custom trip.");

    const { data: msg, error: mErr } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        sender_id: userId,
        body: "Sent a custom trip",
        attachment_type: "custom_offer",
        booking_id: booking.id,
        time_zone_label: data.time_zone_label || null,
        author_timezone: data.author_timezone || null,
        offer_expires_at: data.expires_at || null,
      })
      .select("id")
      .single();
    if (mErr || !msg)
      throw new Error(mErr?.message ?? "Could not post custom trip message.");

    // In-app alert for the angler
    try {
      await supabaseAdmin.from("user_alerts").insert({
        user_id: thread.learner_id,
        kind: "custom_offer_received",
        message: `🎣 ${guideName} sent you a custom trip: ${data.title}`,
      } as never);
    } catch (e) {
      console.error("[createCustomOffer] alert insert failed", e);
    }

    return {
      booking_id: booking.id,
      message_id: msg.id,
      trip_session_id: tripSessionId,
    };
  });

// ---------- My Bookings list ----------

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
        "id, aide_id, learner_id, course_id, trip_session_id, total_price, currency, status, created_at",
      )
      .or(`learner_id.eq.${userId},aide_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const bookingIds = rows.map((r) => r.id);
    const tripSessionIds = Array.from(
      new Set(rows.map((r) => r.trip_session_id).filter(Boolean) as string[]),
    );
    const courseIds = Array.from(
      new Set(rows.map((r) => r.course_id).filter(Boolean) as string[]),
    );
    const otherIds = Array.from(
      new Set(
        rows.map((r) => (r.aide_id === userId ? r.learner_id : r.aide_id)),
      ),
    );

    const [slotsRes, sessionsRes, journeysRes, profilesRes] = await Promise.all([
      supabase
        .from("booking_slots")
        .select("booking_id, starts_at")
        .in("booking_id", bookingIds)
        .order("starts_at", { ascending: true }),
      tripSessionIds.length
        ? supabase
            .from("trip_sessions")
            .select("id, listing_title, session_dates_times_array")
            .in("id", tripSessionIds)
        : Promise.resolve({ data: [] as never[] } as const),
      courseIds.length
        ? supabase.from("journeys").select("id, title").in("id", courseIds)
        : Promise.resolve({ data: [] as never[] } as const),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, display_name, email, avatar_url")
        .in("id", otherIds),
    ]);

    const slotsByBooking = new Map<string, { starts_at: string }[]>();
    for (const s of (slotsRes.data ?? []) as { booking_id: string; starts_at: string }[]) {
      const arr = slotsByBooking.get(s.booking_id) ?? [];
      arr.push({ starts_at: s.starts_at });
      slotsByBooking.set(s.booking_id, arr);
    }
    const sessionById = new Map<string, { listing_title: string; session_dates_times_array: { starts_at: string }[] }>(
      ((sessionsRes.data ?? []) as { id: string; listing_title: string; session_dates_times_array: { starts_at: string }[] }[]).map(
        (c) => [c.id, c],
      ),
    );
    const journeyTitle = new Map<string, string>(
      ((journeysRes.data ?? []) as { id: string; title: string }[]).map((j) => [j.id, j.title]),
    );
    const profileById = new Map<string, { display_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null; avatar_url?: string | null }>(
      ((profilesRes.data ?? []) as never[]).map((p: { id: string }) => [p.id, p as never]),
    );
    const nameOf = (p: { display_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null } | undefined) => {
      if (!p) return "User";
      if (p.display_name?.trim()) return p.display_name.trim();
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      return full || (p.email?.split("@")[0] ?? "User");
    };

    const now = Date.now();
    return rows.map((r) => {
      const tripSession = r.trip_session_id
        ? sessionById.get(r.trip_session_id)
        : null;
      const slots: { starts_at: string }[] = tripSession
        ? ((tripSession.session_dates_times_array ?? []) as { starts_at: string }[]).map((s) => ({
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
          tripSession?.listing_title ??
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
        "id, aide_id, learner_id, course_id, thread_id, trip_session_id, total_price, service_fee_amount, aide_earnings, currency, status, created_at",
      )
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found.");
    if (b.aide_id !== userId && b.learner_id !== userId)
      throw new Error("Not authorized.");

    const [slotsRes, journeyRes, aideRes, learnerRes, msgRes, tsRes] =
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
        b.trip_session_id
          ? supabase
              .from("trip_sessions")
              .select("listing_title, session_dates_times_array")
              .eq("id", b.trip_session_id)
              .maybeSingle()
          : Promise.resolve({ data: null } as const),
      ]);

    const nameOf = (p: { display_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined) => {
      if (!p) return "User";
      if (p.display_name?.trim()) return p.display_name.trim();
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      return full || (p.email?.split("@")[0] ?? "User");
    };

    const tsData = tsRes.data as
      | {
          listing_title: string;
          session_dates_times_array: { starts_at: string; duration_minutes: number }[];
        }
      | null;

    const slots: BookingSlot[] = tsData
      ? (tsData.session_dates_times_array ?? []).map((s, i) => ({
          id: `ts-${i}`,
          starts_at: s.starts_at,
          duration_minutes: s.duration_minutes ?? 45,
        }))
      : ((slotsRes.data ?? []) as BookingSlot[]);

    return {
      ...b,
      slots,
      course_title: tsData?.listing_title ?? journeyRes.data?.title ?? null,
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

    if (
      !Number.isInteger(grossMinor) ||
      !Number.isInteger(newFee) ||
      !Number.isInteger(newPayout)
    ) {
      throw new Error("Internal pricing error — non-integer minor units.");
    }

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
    } catch {
      // no host available (e.g. local dev) — fall back to relative URLs
    }
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = host ? `${proto}://${host}` : "";

    const idemBase = `bk_${b.id}_${grossMinor}_${newFee}_${promoRowId ?? "none"}`;

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
        learner_id: b.learner_id,
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
