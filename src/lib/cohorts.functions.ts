// Server function for creating public cohorts via the "Schedule Live Date" modal.
// Writes to class_sessions with is_public_cohort=true.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { zonedWallTimeToUtcISO } from "@/lib/tz";

const SlotInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

const CreatePublicCohortInput = z.object({
  journey_id: z.string().uuid(),
  cohort_title: z.string().trim().min(1).max(120),
  max_seats: z.number().int().min(1).max(50),
  slots: z.array(SlotInput).min(1).max(20),
  price_minor: z.number().int().min(100).max(10_000_00),
  currency: z.string().trim().min(3).max(8),
  expires_at: z.string().datetime().nullable(),
  session_duration_minutes: z.number().int().min(15).max(480).default(45),
});

function buildAdminLabel(cohortTitle: string, firstSlotIso: string): string {
  const d = new Date(firstSlotIso);
  const dow = d.toLocaleDateString("en-US", { weekday: "long" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const startDate = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `[Public Cohort] ${cohortTitle} • ${dow} @ ${time} • Starts ${startDate}`;
}

export const createPublicCohort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreatePublicCohortInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("id, mentor_id, title, session_length_minutes")
      .eq("id", data.journey_id)
      .maybeSingle();
    if (jErr || !journey) throw new Error("Listing not found.");
    if (journey.mentor_id !== userId)
      throw new Error("You can only schedule cohorts on your own listing.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle();
    const tz = profile?.timezone;
    if (!tz)
      throw new Error("Your profile timezone is missing. Please set it in Profile Settings.");

    const durationMinutes = data.session_duration_minutes ?? journey.session_length_minutes ?? 45;

    const slots = data.slots
      .map((s) => ({
        starts_at: zonedWallTimeToUtcISO(s.date, s.time, tz),
        duration_minutes: durationMinutes,
      }))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    const adminLabel = buildAdminLabel(data.cohort_title, slots[0].starts_at);

    const { data: cs, error: csErr } = await supabase
      .from("class_sessions")
      .insert({
        aide_id: userId,
        course_id: journey.id,
        listing_title: journey.title,
        cohort_title: data.cohort_title,
        session_dates_times_array: slots,
        max_seats: data.max_seats,
        filled_seats: 0,
        price_minor: data.price_minor,
        currency: data.currency.toUpperCase(),
        expires_at: data.expires_at,
        is_public_cohort: true,
        admin_label: adminLabel,
        status: "active",
      })
      .select("id")
      .single();
    if (csErr || !cs) throw new Error(csErr?.message ?? "Could not save cohort.");

    return { id: cs.id };
  });

// "Book Seat" on a public cohort. Creates a pending_payment booking row tied
// to the chosen class_session and returns its id. The learner is then routed
// to /booking-review, where the existing createBookingCheckoutSession flow
// opens Stripe — mirroring the Custom Offer accept path.
const BookCohortSeatInput = z.object({
  class_session_id: z.string().uuid(),
});

export const createCohortBookingCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BookCohortSeatInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { computeFeeBreakdown } = await import("@/lib/fees");
    const { getPlatformFeeRate } = await import("@/lib/platform-fee.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Public cohorts are not visible to learners via RLS; use admin read.
    const { data: cs, error: csErr } = await supabaseAdmin
      .from("class_sessions")
      .select(
        "id, aide_id, course_id, max_seats, filled_seats, price_minor, currency, expires_at, is_public_cohort, status, listing_title",
      )
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (csErr || !cs) throw new Error("Cohort not found.");
    if (cs.status !== "active") throw new Error("This cohort is no longer open.");
    if (cs.aide_id === userId) throw new Error("You can't book a seat on your own cohort.");
    if (cs.expires_at && new Date(cs.expires_at).getTime() < Date.now())
      throw new Error("This cohort is no longer accepting bookings.");

    // Live seat count check (don't trust filled_seats alone).
    const { count: confirmedCount } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("class_session_id", cs.id)
      .eq("status", "confirmed");
    const seatsLeft = (cs.max_seats ?? 0) - (confirmedCount ?? 0);
    if (seatsLeft <= 0) throw new Error("This cohort is fully booked.");

    if (!cs.course_id) throw new Error("Cohort is not linked to a course.");
    const { data: journey, error: jErr } = await supabaseAdmin
      .from("journeys")
      .select("id, base_price_minor, currency")
      .eq("id", cs.course_id)
      .maybeSingle();
    if (jErr || !journey) throw new Error("Course not found.");

    const totalPriceMinor = cs.price_minor ?? journey.base_price_minor;
    const currency = (cs.currency ?? journey.currency ?? "USD").toUpperCase();
    if (!totalPriceMinor || totalPriceMinor < 100) throw new Error("Cohort price is not set.");

    // Ensure a message thread exists (bookings.thread_id is NOT NULL).
    const { data: existingThread } = await supabase
      .from("message_threads")
      .select("id")
      .eq("learner_id", userId)
      .eq("mentor_id", cs.aide_id)
      .eq("journey_id", cs.course_id)
      .maybeSingle();
    let threadId = existingThread?.id;
    if (!threadId) {
      const { data: newThread, error: tErr } = await supabase
        .from("message_threads")
        .insert({
          learner_id: userId,
          mentor_id: cs.aide_id,
          journey_id: cs.course_id,
        })
        .select("id")
        .single();
      if (tErr || !newThread) throw new Error(tErr?.message ?? "Could not start conversation.");
      threadId = newThread.id;
    }

    const feeRate = await getPlatformFeeRate();
    const fees = computeFeeBreakdown(totalPriceMinor, feeRate);

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        aide_id: cs.aide_id,
        learner_id: userId,
        course_id: cs.course_id,
        thread_id: threadId,
        class_session_id: cs.id,
        total_price: totalPriceMinor,
        service_fee_amount: fees.feeMinor,
        aide_earnings: fees.payoutMinor,
        currency,
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (bErr || !booking) throw new Error(bErr?.message ?? "Could not create booking.");

    return { booking_id: booking.id };
  });
