// Server functions for the trip booking flow:
// Listing page -> CheckDatesDialog -> /booking/checkout -> Stripe deposit checkout.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeFeeBreakdown } from "@/lib/fees";
import { getPlatformFeeRate } from "@/lib/platform-fee.server";
import { createCheckoutSession as gwCreateCheckoutSession } from "@/lib/stripe.server";

export interface TripReviewDetails {
  trip: {
    id: string;
    title: string;
    start_time: string | null;
    duration_minutes: number;
    price_minor: number;
    per_extra_minor: number;
    charter_type: "private_charter" | "shared_tour";
    currency: string;
    departure_address: string | null;
  };
  operator: {
    id: string;
    display_name: string;
    cancellation_policy: "flexible" | "moderate" | "strict" | null;
    default_departure_address: string | null;
    default_departure_city: string | null;
    cover_image_url: string | null;
  };
  captain_name: string;
  captain_avatar_url: string | null;
  trip_date: string;
  guests: number;
  pricing: {
    total_minor: number;
    deposit_minor: number;
    balance_minor: number;
    currency: string;
  };
  viewer: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  };
}

function computeTripTotal(
  charter: "private_charter" | "shared_tour",
  price_minor: number,
  per_extra_minor: number,
  guests: number,
): number {
  const g = Math.max(1, guests);
  if (charter === "shared_tour") return price_minor * g;
  return price_minor + per_extra_minor * Math.max(0, g - 1);
}

const ReviewInput = z.object({
  trip_id: z.string().uuid(),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(50),
});

export const getTripReviewDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReviewInput.parse(i))
  .handler(async ({ data, context }): Promise<TripReviewDetails> => {
    const { supabase, userId } = context;

    const { data: trip, error: tErr } = await supabase
      .from("trip_packages")
      .select(
        "id, title, start_time, duration_minutes, price_minor, per_extra_minor, charter_type, currency, departure_address, operator_id, seats_available",
      )
      .eq("id", data.trip_id)
      .maybeSingle();
    if (tErr || !trip) throw new Error("Trip not found.");

    const { data: operator, error: oErr } = await supabase
      .from("operators")
      .select(
        "id, display_name, owner_id, cancellation_policy, default_departure_address, default_departure_city, cover_image_url",
      )
      .eq("id", trip.operator_id)
      .maybeSingle();
    if (oErr || !operator) throw new Error("Operator not found.");

    const { data: captain } = await supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url")
      .eq("id", operator.owner_id)
      .maybeSingle();
    const captain_name =
      captain?.display_name?.trim() ||
      [captain?.first_name, captain?.last_name].filter(Boolean).join(" ").trim() ||
      operator.display_name?.trim() ||
      "Your captain";

    // Capacity recheck for shared tours
    if (trip.charter_type === "shared_tour") {
      const { data: bookedRows } = await supabase.rpc(
        "trip_seats_booked_by_date",
        { _trip_id: trip.id },
      );
      const booked =
        (bookedRows ?? []).find((r: any) => r.trip_date === data.trip_date)
          ?.seats_booked ?? 0;
      const remaining = Math.max(0, (trip.seats_available ?? 0) - booked);
      if (data.guests > remaining) {
        throw new Error(
          `Only ${remaining} seat${remaining === 1 ? "" : "s"} left for that date.`,
        );
      }
    }

    const total_minor = computeTripTotal(
      trip.charter_type,
      trip.price_minor,
      trip.per_extra_minor ?? 0,
      data.guests,
    );
    const deposit_minor = Math.round(total_minor * 0.1);
    const balance_minor = total_minor - deposit_minor;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone_number")
      .eq("id", userId)
      .maybeSingle();

    return {
      trip: {
        id: trip.id,
        title: trip.title,
        start_time: trip.start_time,
        duration_minutes: trip.duration_minutes,
        price_minor: trip.price_minor,
        per_extra_minor: trip.per_extra_minor ?? 0,
        charter_type: trip.charter_type,
        currency: trip.currency,
        departure_address: trip.departure_address,
      },
      operator: {
        id: operator.id,
        display_name: operator.display_name ?? "",
        cancellation_policy: operator.cancellation_policy as any,
        default_departure_address: operator.default_departure_address,
        default_departure_city: operator.default_departure_city,
        cover_image_url: operator.cover_image_url,
      },
      captain_name,
      captain_avatar_url: captain?.avatar_url ?? null,
      trip_date: data.trip_date,
      guests: data.guests,
      pricing: {
        total_minor,
        deposit_minor,
        balance_minor,
        currency: trip.currency,
      },
      viewer: {
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        phone: profile?.phone_number ?? null,
        email: profile?.email ?? null,
      },
    };
  });

const CheckoutInput = z.object({
  trip_id: z.string().uuid(),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(50),
  primary_angler_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(32),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createTripDepositCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheckoutInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: trip, error: tErr } = await supabase
      .from("trip_packages")
      .select(
        "id, title, price_minor, per_extra_minor, charter_type, currency, operator_id, seats_available",
      )
      .eq("id", data.trip_id)
      .maybeSingle();
    if (tErr || !trip) throw new Error("Trip not found.");

    const { data: operator } = await supabase
      .from("operators")
      .select("id, owner_id")
      .eq("id", trip.operator_id)
      .maybeSingle();
    if (!operator) throw new Error("Operator not found.");

    // Capacity recheck for shared tours
    if (trip.charter_type === "shared_tour") {
      const { data: bookedRows } = await supabase.rpc(
        "trip_seats_booked_by_date",
        { _trip_id: trip.id },
      );
      const booked =
        (bookedRows ?? []).find((r: any) => r.trip_date === data.trip_date)
          ?.seats_booked ?? 0;
      const remaining = Math.max(0, (trip.seats_available ?? 0) - booked);
      if (data.guests > remaining) {
        throw new Error(
          `Only ${remaining} seat${remaining === 1 ? "" : "s"} left for that date.`,
        );
      }
    }

    const total_minor = computeTripTotal(
      trip.charter_type,
      trip.price_minor,
      trip.per_extra_minor ?? 0,
      data.guests,
    );
    const deposit_minor = Math.round(total_minor * 0.1);
    const balance_minor = total_minor - deposit_minor;

    const feeRate = await getPlatformFeeRate();
    // Service fee is applied against the deposit amount being charged today.
    const fees = computeFeeBreakdown(deposit_minor, feeRate);

    // Deposit is charged to the platform Stripe account. The dockside
    // balance is collected by the captain offline, so no Stripe Connect
    // transfer is required and we no longer block on the captain having a
    // connected payout account.



    const bookingAdmin = supabaseAdmin;
    const { data: booking, error: bErr } = await bookingAdmin
      .from("bookings")
      .insert({
        aide_id: operator.owner_id,
        learner_id: userId,
        course_id: trip.id,
        trip_date: data.trip_date,
        guests: data.guests,
        total_price: total_minor,
        service_fee_amount: fees.feeMinor,
        aide_earnings: fees.payoutMinor,
        currency: trip.currency.toUpperCase(),
        status: "pending_payment",
        primary_angler_name: data.primary_angler_name,
        phone: data.phone,
        notes: data.notes ?? null,
        deposit_minor,
        balance_due_minor: balance_minor,
      } as any)
      .select("id")
      .single();
    if (bErr || !booking)
      throw new Error(bErr?.message ?? "Could not create booking.");

    let host = "";
    try {
      host = getRequestHost();
    } catch {}
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = host ? `${proto}://${host}` : "";

    const idemBase = `trip_${booking.id}_${deposit_minor}`;

    const { createStripeProduct, createStripePrice } = await import(
      "@/lib/stripe.server"
    );
    const product = await createStripeProduct({
      name: `${trip.title} — Deposit (Booking ${booking.id.slice(0, 8)})`,
      metadata: { booking_id: booking.id, trip_id: trip.id },
      idempotencyKey: `${idemBase}_product`,
    });
    const price = await createStripePrice({
      product: product.id,
      unit_amount: deposit_minor,
      currency: trip.currency,
      idempotencyKey: `${idemBase}_price`,
    });

    const session = await gwCreateCheckoutSession({
      price: price.id,
      success_url: `${origin}/checkout/success?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/checkout?trip_id=${trip.id}&trip_date=${data.trip_date}&guests=${data.guests}`,
      client_reference_id: userId,
      metadata: {
        booking_id: booking.id,
        trip_id: trip.id,
        parent_id: userId,
        learner_id: userId,
        aide_id: operator.owner_id,
        deposit_minor: String(deposit_minor),
        balance_due_minor: String(balance_minor),
        total_minor: String(total_minor),
      },
      idempotencyKey: `${idemBase}_session`,
    });

    await bookingAdmin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    return { url: session.url, booking_id: booking.id };
  });

// --------------------------------------------------------------------------
// Simulated payment success (dev only — used until Stripe is wired up live).
// Creates the booking row and immediately marks it confirmed, firing the
// same downstream side-effects (host_availability trigger, captain alert,
// confirmation emails) that the real Stripe webhook produces.
// --------------------------------------------------------------------------

export const simulateTripDepositPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheckoutInput.parse(i))
  .handler(async ({ data, context }) => {
    if (process.env.SIMULATE_PAYMENTS !== "true") {
      throw new Error("Payment simulation is disabled.");
    }

    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: trip, error: tErr } = await supabase
      .from("trip_packages")
      .select(
        "id, title, price_minor, per_extra_minor, charter_type, currency, operator_id, seats_available",
      )
      .eq("id", data.trip_id)
      .maybeSingle();
    if (tErr || !trip) throw new Error("Trip not found.");

    const { data: operator } = await supabase
      .from("operators")
      .select("id, owner_id")
      .eq("id", trip.operator_id)
      .maybeSingle();
    if (!operator) throw new Error("Operator not found.");

    if (trip.charter_type === "shared_tour") {
      const { data: bookedRows } = await supabase.rpc(
        "trip_seats_booked_by_date",
        { _trip_id: trip.id },
      );
      const booked =
        (bookedRows ?? []).find((r: any) => r.trip_date === data.trip_date)
          ?.seats_booked ?? 0;
      const remaining = Math.max(0, (trip.seats_available ?? 0) - booked);
      if (data.guests > remaining) {
        throw new Error(
          `Only ${remaining} seat${remaining === 1 ? "" : "s"} left for that date.`,
        );
      }
    }

    const total_minor = computeTripTotal(
      trip.charter_type,
      trip.price_minor,
      trip.per_extra_minor ?? 0,
      data.guests,
    );
    const deposit_minor = Math.round(total_minor * 0.1);
    const balance_minor = total_minor - deposit_minor;

    const feeRate = await getPlatformFeeRate();
    const fees = computeFeeBreakdown(deposit_minor, feeRate);

    const simSessionId = `sim_${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now().toString(36)
    }`;

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        aide_id: operator.owner_id,
        learner_id: userId,
        course_id: trip.id,
        trip_date: data.trip_date,
        guests: data.guests,
        total_price: total_minor,
        service_fee_amount: fees.feeMinor,
        aide_earnings: fees.payoutMinor,
        currency: trip.currency.toUpperCase(),
        status: "confirmed",
        primary_angler_name: data.primary_angler_name,
        phone: data.phone,
        notes: data.notes ?? null,
        deposit_minor,
        balance_due_minor: balance_minor,
        stripe_checkout_session_id: simSessionId,
      } as any)
      .select("id")
      .single();
    if (bErr || !booking)
      throw new Error(bErr?.message ?? "Could not create booking.");

    // Notify the captain — alert + best-effort emails (matches webhook).
    try {
      const { renderAlertTemplate } = await import("@/lib/alert-templates.server");
      const { renderEmailTemplate } = await import("@/lib/email-templates.server");
      const { sendEmail } = await import("@/lib/email-sender.server");

      const courseTitle = trip.title ?? "your trip";

      const [{ data: aideProfile }, { data: learnerProfile }] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("first_name, email")
          .eq("id", operator.owner_id)
          .maybeSingle(),
        supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      const learnerName =
        [learnerProfile?.first_name, learnerProfile?.last_name]
          .filter(Boolean)
          .join(" ") || "A new angler";

      const alertMessage = await renderAlertTemplate("booking_confirmed", {
        course_title: courseTitle,
      });
      await supabaseAdmin.from("user_alerts").insert({
        user_id: operator.owner_id,
        kind: "booking_confirmed",
        journey_id: null,
        message: alertMessage,
      });

      if (aideProfile?.email) {
        try {
          const aideEmail = await renderEmailTemplate("booking_confirmed_aide", {
            aide_first_name: aideProfile.first_name ?? "there",
            learner_name: learnerName,
            course_title: courseTitle,
            schedule_url: "/dashboard/upcoming-sessions",
          });
          await sendEmail({
            to: aideProfile.email,
            subject: aideEmail.subject,
            body: aideEmail.body,
          });
        } catch (e) {
          console.error("[simulate-payment] aide email failed", e);
        }
      }

      if (learnerProfile?.email) {
        try {
          const learnerEmail = await renderEmailTemplate("booking_confirmed_learner", {
            learner_first_name: learnerProfile.first_name ?? "there",
            course_title: courseTitle,
            schedule_url: "/dashboard/learner/schedule",
          });
          await sendEmail({
            to: learnerProfile.email,
            subject: learnerEmail.subject,
            body: learnerEmail.body,
          });
        } catch (e) {
          console.error("[simulate-payment] learner email failed", e);
        }
      }
    } catch (e) {
      console.error("[simulate-payment] post-confirm notifications failed", e);
    }

    return { booking_id: booking.id };
  });

// --------------------------------------------------------------------------
// List trip bookings (surfaces for learner hub, captain dashboards, admin).
// All return a uniform TripBookingSummary so consumers can render the same row.
// --------------------------------------------------------------------------

export interface TripBookingSummary {
  id: string;
  status: "pending_payment" | "confirmed" | "declined" | "pending_offer" | "completed";
  trip_date: string | null;
  guests: number | null;
  total_price_minor: number;
  deposit_minor: number | null;
  balance_due_minor: number | null;
  aide_earnings_minor: number;
  service_fee_minor: number;
  currency: string;
  created_at: string;
  trip_title: string | null;
  trip_start_time: string | null;
  operator_display_name: string | null;
  captain_name: string | null;
  captain_email: string | null;
  captain_phone: string | null;
  meeting_location: string | null;
  learner_name: string | null;
  learner_email: string | null;
  primary_angler_name: string | null;
  phone: string | null;
  notes: string | null;
  stripe_checkout_session_id: string | null;
  is_simulated: boolean;
  source: "instant_book" | "custom_offer";
  thread_id: string | null;
}

const BOOKING_COLS =
  "id, status, trip_date, guests, total_price, deposit_minor, balance_due_minor, aide_earnings, service_fee_amount, currency, created_at, course_id, aide_id, learner_id, primary_angler_name, phone, notes, stripe_checkout_session_id, thread_id";

async function hydrateTripBookings(
  rows: any[],
): Promise<TripBookingSummary[]> {
  if (rows.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const tripIds = Array.from(
    new Set(rows.map((r) => r.course_id).filter(Boolean) as string[]),
  );
  const profileIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.aide_id, r.learner_id]).filter(Boolean) as string[],
    ),
  );
  const bookingIds = rows.map((r) => r.id);

  const [tripsRes, profilesRes, offerMsgsRes] = await Promise.all([
    tripIds.length
      ? supabaseAdmin
          .from("trip_packages")
          .select("id, title, start_time, operator_id, departure_address")
          .in("id", tripIds)
      : Promise.resolve({ data: [] as any[] } as const),
    profileIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id, first_name, last_name, display_name, email, phone_number")
          .in("id", profileIds)
      : Promise.resolve({ data: [] as any[] } as const),
    bookingIds.length
      ? supabaseAdmin
          .from("messages")
          .select("booking_id")
          .in("booking_id", bookingIds)
          .eq("attachment_type", "custom_offer")
      : Promise.resolve({ data: [] as any[] } as const),
  ]);

  const operatorIds = Array.from(
    new Set(((tripsRes.data ?? []) as any[]).map((t) => t.operator_id).filter(Boolean)),
  );
  const { data: operators } = operatorIds.length
    ? await supabaseAdmin
        .from("operators")
        .select("id, display_name, default_departure_address")
        .in("id", operatorIds)
    : { data: [] as any[] };

  const tripsById = new Map<string, any>(
    ((tripsRes.data ?? []) as any[]).map((t) => [t.id, t]),
  );
  const profilesById = new Map<string, any>(
    ((profilesRes.data ?? []) as any[]).map((p) => [p.id, p]),
  );
  const operatorsById = new Map<string, any>(
    ((operators ?? []) as any[]).map((o) => [o.id, o]),
  );
  const customOfferBookingIds = new Set<string>(
    ((offerMsgsRes.data ?? []) as any[]).map((m) => m.booking_id),
  );

  const nameOf = (p: any) =>
    p?.display_name?.trim() ||
    [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() ||
    p?.email?.split("@")[0] ||
    null;

  return rows.map((r) => {
    const trip = r.course_id ? tripsById.get(r.course_id) : null;
    const operator = trip?.operator_id ? operatorsById.get(trip.operator_id) : null;
    const aide = profilesById.get(r.aide_id);
    const learner = profilesById.get(r.learner_id);
    const sessionId: string | null = r.stripe_checkout_session_id ?? null;
    const isCustomOffer = customOfferBookingIds.has(r.id) || r.status === "pending_offer";
    return {
      id: r.id,
      status: r.status,
      trip_date: r.trip_date,
      guests: r.guests,
      total_price_minor: r.total_price ?? 0,
      deposit_minor: r.deposit_minor ?? null,
      balance_due_minor: r.balance_due_minor ?? null,
      aide_earnings_minor: r.aide_earnings ?? 0,
      service_fee_minor: r.service_fee_amount ?? 0,
      currency: r.currency ?? "USD",
      created_at: r.created_at,
      trip_title: trip?.title ?? null,
      trip_start_time: trip?.start_time ?? null,
      operator_display_name: operator?.display_name ?? null,
      captain_name: nameOf(aide),
      captain_email: aide?.email ?? null,
      captain_phone: aide?.phone_number ?? null,
      meeting_location: trip?.departure_address ?? operator?.default_departure_address ?? null,
      learner_name: nameOf(learner),
      learner_email: learner?.email ?? null,
      primary_angler_name: r.primary_angler_name ?? null,
      phone: r.phone ?? null,
      notes: r.notes ?? null,
      stripe_checkout_session_id: sessionId,
      is_simulated: Boolean(sessionId && sessionId.startsWith("sim_")),
      source: isCustomOffer ? "custom_offer" : "instant_book",
      thread_id: r.thread_id ?? null,
    };
  });
}

export const listMyTripBookingsLearner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TripBookingSummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_COLS)
      .eq("learner_id", userId)
      .in("status", ["confirmed", "pending_payment", "pending_offer", "completed"])
      .not("trip_date", "is", null)
      .order("trip_date", { ascending: true });
    if (error) throw new Error(error.message);
    return hydrateTripBookings(data ?? []);
  });

export const listMyTripBookingsAide = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TripBookingSummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_COLS)
      .eq("aide_id", userId)
      .in("status", ["confirmed", "pending_payment", "pending_offer", "completed"])
      .not("trip_date", "is", null)
      .order("trip_date", { ascending: true });
    if (error) throw new Error(error.message);
    return hydrateTripBookings(data ?? []);
  });

export const listAllTripBookingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TripBookingSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_COLS)
      .not("trip_date", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return hydrateTripBookings(data ?? []);
  });

// --------------------------------------------------------------------------
// Mark a confirmed trip booking as completed (captain action).
// --------------------------------------------------------------------------

const MarkCompleteInput = z.object({ booking_id: z.string().uuid() });

export const markTripBookingComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MarkCompleteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, aide_id, learner_id, status, course_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found.");
    if (booking.aide_id !== userId) throw new Error("Not your booking.");
    if (booking.status !== "confirmed")
      throw new Error("Only confirmed bookings can be marked complete.");

    const { error: uErr } = await supabaseAdmin
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", data.booking_id);
    if (uErr) throw new Error(uErr.message);

    // Best-effort learner alert prompting them to leave a review.
    try {
      let tripTitle = "your trip";
      if (booking.course_id) {
        const { data: trip } = await supabaseAdmin
          .from("trip_packages")
          .select("title")
          .eq("id", booking.course_id)
          .maybeSingle();
        if (trip?.title) tripTitle = trip.title;
      }
      await supabaseAdmin.from("user_alerts").insert({
        user_id: booking.learner_id,
        kind: "booking_confirmed",
        journey_id: null,
        message: `Your trip "${tripTitle}" was marked complete. Leave a review for your captain!`,
      });
    } catch (e) {
      console.error("[markTripBookingComplete] alert failed", e);
    }

    return { ok: true };
  });

// --------------------------------------------------------------------------
// Cancel a pending custom offer (captain action).
// --------------------------------------------------------------------------

export const cancelPendingTripOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MarkCompleteInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, aide_id, status")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found.");
    if (booking.aide_id !== userId) throw new Error("Not your booking.");
    if (booking.status !== "pending_offer" && booking.status !== "pending_payment")
      throw new Error("Only pending offers can be cancelled.");

    // Release any held calendar dates first (FK is ON DELETE SET NULL,
    // not CASCADE, so the trigger-driven cleanup may not fire on delete).
    await supabaseAdmin
      .from("host_availability")
      .delete()
      .eq("booking_id", data.booking_id);

    const { error: dErr } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", data.booking_id);
    if (dErr) throw new Error(dErr.message);

    return { ok: true };
  });


