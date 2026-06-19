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

    // Captain Connect preflight
    const { data: captainProfile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id, is_payout_ready")
      .eq("id", operator.owner_id)
      .maybeSingle();
    if (!captainProfile?.stripe_connect_id || !captainProfile.is_payout_ready) {
      throw new Error(
        "This captain is still finishing payout setup. Please try again shortly.",
      );
    }

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
      application_fee_amount: fees.feeMinor,
      transfer_destination: captainProfile.stripe_connect_id,
      idempotencyKey: `${idemBase}_session`,
    });

    await bookingAdmin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    return { url: session.url, booking_id: booking.id };
  });
