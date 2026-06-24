import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  verifyStripeWebhookSignature,
  retrievePaymentIntent,
  resolveWebhookSecretCandidates,
} from "@/lib/stripe.server";
import { renderEmailTemplate } from "@/lib/email-templates.server";
import { renderAlertTemplate } from "@/lib/alert-templates.server";
import { sendEmail } from "@/lib/email-sender.server";

async function safeHandle(
  fn: () => Promise<void>,
  eventType: string,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[payments-webhook] handler error for ${eventType}`, err);
  }
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const envParam = new URL(request.url).searchParams.get("env");
          const env: "sandbox" | "live" | null =
            envParam === "sandbox" || envParam === "live" ? envParam : null;

          let secrets: string[] = [];
          try {
            secrets = await resolveWebhookSecretCandidates(env);
          } catch (err) {
            console.error("[payments-webhook] secret lookup failed", err);
          }
          if (secrets.length === 0) {
            console.error("[payments-webhook] no webhook secrets configured; ack 200");
            return Response.json({ received: true, ignored: "no_webhook_secret" });
          }

          const rawBody = await request.text();
          const sig =
            request.headers.get("stripe-signature") ??
            request.headers.get("Stripe-Signature");

          if (!sig) {
            console.warn("[payments-webhook] missing stripe-signature header");
            return new Response("Missing signature", { status: 400 });
          }

          let ok = false;
          try {
            ok = secrets.some((secret) =>
              verifyStripeWebhookSignature({ rawBody, signatureHeader: sig, secret }),
            );
          } catch (err) {
            console.error("[payments-webhook] signature verification threw", err);
            return new Response("Invalid signature", { status: 400 });
          }
          if (!ok) {
            console.warn("[payments-webhook] invalid signature");
            return new Response("Invalid signature", { status: 400 });
          }

          let event: any;
          try {
            event = JSON.parse(rawBody);
          } catch {
            return new Response("Bad JSON", { status: 400 });
          }

          const eventType: string = event?.type ?? "unknown";
          const eventId: string | undefined = event?.id;

          switch (eventType) {
            case "checkout.session.completed":
              await safeHandle(
                () => handleCheckoutCompleted(event.data?.object),
                eventType,
              );
              break;

            // Stripe Connect v2 account lifecycle — acknowledged, no-op for now.
            case "v2.core.account.created":
            case "v2.core.account.updated":
            case "v2.core.account_person.created":
            case "v2.core.account[configuration.merchant].capability_status_updated":
              console.log("[payments-webhook] ack v2.core event", eventType, eventId);
              break;

            default:
              console.log("[payments-webhook] ignored event", eventType, eventId);
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          // Last-resort guard: never let Stripe see a 500.
          console.error("[payments-webhook] unexpected top-level error", err);
          return Response.json({ received: true, ignored: "internal_error" });
        }
      },
    },
  },
});

async function handleCheckoutCompleted(session: any) {
  if (!session) return;
  if (session.payment_status && session.payment_status !== "paid") return;

  const meta = session.metadata ?? {};

  // Best-effort: fetch the Stripe-hosted receipt URL from the linked charge.
  let receiptUrl: string | null = null;
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  if (piId) {
    try {
      const pi = await retrievePaymentIntent(piId);
      const lc = pi.latest_charge;
      if (lc && typeof lc === "object" && lc.receipt_url) {
        receiptUrl = lc.receipt_url;
      }
    } catch (e) {
      console.error("[payments-webhook] retrieve PI failed", e);
    }
  }

  // Booking-flow checkout: create the orders row (idempotent on
  // stripe_checkout_session_id) so the learner schedule, classroom,
  // and billing surfaces unlock.
  if (meta.booking_id) {
    try {
      const { data: booking, error: bErr } = await supabaseAdmin
        .from("bookings")
        .select(
          "id, aide_id, learner_id, course_id, trip_session_id, total_price, service_fee_amount, aide_earnings, currency",
        )
        .eq("id", meta.booking_id)
        .maybeSingle();
      if (bErr) console.error("[payments-webhook] booking load error", bErr);

      if (booking && booking.course_id) {
        let snapshotTitle: string | null = null;
        let slots: { starts_at: string; duration_minutes?: number }[] = [];
        if (booking.trip_session_id) {
          const { data: ts } = await supabaseAdmin
            .from("trip_sessions")
            .select("listing_title, session_dates_times_array")
            .eq("id", booking.trip_session_id)
            .maybeSingle();
          snapshotTitle = ts?.listing_title ?? null;
          slots = (ts?.session_dates_times_array ?? []) as typeof slots;
        }
        if (!snapshotTitle) {
          const { data: j } = await supabaseAdmin
            .from("journeys")
            .select("title")
            .eq("id", booking.course_id)
            .maybeSingle();
          snapshotTitle = j?.title ?? null;
        }

        const sortedSlots = [...slots].sort((a, b) =>
          (a.starts_at ?? "").localeCompare(b.starts_at ?? ""),
        );
        const firstSlot = sortedSlots[0];
        const snapshotSessionTitles = sortedSlots.map((s) => ({
          starts_at: s.starts_at,
          duration_minutes: s.duration_minutes ?? 45,
        }));

        const totalPaid = Number(session.amount_total ?? booking.total_price);
        const currency = String(
          session.currency ?? booking.currency ?? "USD",
        ).toUpperCase();

        const { error: insErr } = await supabaseAdmin.from("orders").insert({
          learner_id: booking.learner_id,
          mentor_id: booking.aide_id,
          journey_id: booking.course_id,
          booking_id: booking.id,
          total_paid_minor: totalPaid,
          platform_fee_minor: booking.service_fee_amount ?? 0,
          aide_payout_minor: booking.aide_earnings ?? 0,
          currency,
          snapshot_currency: currency,
          snapshot_total_minor: totalPaid,
          sessions_remaining: sortedSlots.length || 1,
          snapshot_total_sessions: sortedSlots.length || 1,
          snapshot_session_duration: firstSlot?.duration_minutes ?? 45,
          snapshot_course_title: snapshotTitle,
          snapshot_session_titles: snapshotSessionTitles,
          scheduled_time: firstSlot?.starts_at ?? null,
          order_status: "active",
          stripe_checkout_session_id: session.id,
          receipt_url: receiptUrl,
        });
        if (insErr && (insErr as { code?: string }).code !== "23505") {
          console.error("[payments-webhook] order insert error", insErr);
        }
      } else if (!booking) {
        console.error(
          "[payments-webhook] booking not found for id",
          meta.booking_id,
        );
      } else {
        console.error(
          "[payments-webhook] booking missing course_id; skipping order insert",
          { booking_id: booking.id },
        );
      }
    } catch (e) {
      console.error("[payments-webhook] order provisioning threw", e);
    }
  }

  // Booking-flow checkout
  if (meta.booking_id) {
    const { data: updated, error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "confirmed",
        stripe_checkout_session_id: session.id,
      })
      .eq("id", meta.booking_id)
      .select("id, aide_id, learner_id, course_id")
      .maybeSingle();
    if (error) console.error("[payments-webhook] booking confirm error", error);

    // Notify the instructor with an in-app alert + staged transactional email.
    if (updated?.aide_id) {
      try {
        let courseTitle = "your course";
        if (updated.course_id) {
          const { data: j } = await supabaseAdmin
            .from("journeys")
            .select("title")
            .eq("id", updated.course_id)
            .maybeSingle();
          if (j?.title) courseTitle = j.title;
        }

        // Lookup profiles for email/name personalization
        const [{ data: aideProfile }, { data: learnerProfile }] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("first_name, email")
            .eq("id", updated.aide_id)
            .maybeSingle(),
          updated.learner_id
            ? supabaseAdmin
                .from("profiles")
                .select("first_name, last_name, email")
                .eq("id", updated.learner_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const learnerName = [learnerProfile?.first_name, learnerProfile?.last_name]
          .filter(Boolean)
          .join(" ") || "A new student";

        const alertMessage = await renderAlertTemplate("booking_confirmed", {
          course_title: courseTitle,
        });
        const { error: alertErr } = await supabaseAdmin
          .from("user_alerts")
          .insert({
            user_id: updated.aide_id,
            kind: "booking_confirmed",
            journey_id: updated.course_id,
            message: alertMessage,
          });
        if (alertErr)
          console.error("[payments-webhook] aide alert error", alertErr);

        // Send transactional emails via Resend.
        const scheduleUrl = "/dashboard/upcoming-sessions";

        if (aideProfile?.email) {
          try {
            const aideEmail = await renderEmailTemplate("booking_confirmed_aide", {
              aide_first_name: aideProfile.first_name ?? "there",
              learner_name: learnerName,
              course_title: courseTitle,
              schedule_url: scheduleUrl,
            });
            await sendEmail({
              to: aideProfile.email,
              subject: aideEmail.subject,
              body: aideEmail.body,
            });
          } catch (e) {
            console.error("[payments-webhook] aide email send failed", e);
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
            console.error("[payments-webhook] learner email send failed", e);
          }
        }
      } catch (e) {
        console.error("[payments-webhook] aide alert threw", e);
      }
    }
    return;
  }

  // No booking_id on the session → nothing to provision. The legacy
  // "metadata-only" path was removed because it let a checkout session
  // with attacker-controlled metadata (learner_id/mentor_id/journey_id)
  // create an order row without a linked, server-side booking. All
  // legitimate checkouts now go through the booking flow above.
  console.error("[payments-webhook] checkout.session.completed without booking_id; ignoring", {
    session_id: session.id,
  });
}

