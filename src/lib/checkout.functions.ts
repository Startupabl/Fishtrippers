// Server functions for Stripe checkout. Client-safe to import.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";
import {
  createStripeProduct,
  createStripePrice,
  createCheckoutSession as gwCreateCheckoutSession,
} from "@/lib/stripe.server";

const Input = z.object({ journey_id: z.string().uuid() });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select(
        "id, slug, title, description, mentor_id, base_price_minor, currency, session_count, status, stripe_product_id, stripe_price_id",
      )
      .eq("id", data.journey_id)
      .eq("status", "published")
      .maybeSingle();
    if (jErr || !journey) throw new Error("Course not found or unavailable.");

    // Lazily create Stripe product + price on first checkout.
    let priceId = journey.stripe_price_id;
    if (!priceId) {
      let productId = journey.stripe_product_id;
      if (!productId) {
        const product = await createStripeProduct({
          name: journey.title,
          description: journey.description ?? undefined,
          metadata: { journey_id: journey.id },
        });
        productId = product.id;
      }
      const price = await createStripePrice({
        product: productId,
        unit_amount: journey.base_price_minor,
        currency: journey.currency,
      });
      priceId = price.id;

      await supabase
        .from("journeys")
        .update({ stripe_product_id: productId, stripe_price_id: priceId })
        .eq("id", journey.id);
    }

    let host = "";
    try {
      host = getRequestHost();
    } catch {}
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = host ? `${proto}://${host}` : "";

    const session = await gwCreateCheckoutSession({
      price: priceId,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/p/${journey.slug}`,
      client_reference_id: userId,
      metadata: {
        learner_id: userId,
        mentor_id: journey.mentor_id,
        journey_id: journey.id,
        session_count: String(journey.session_count),
      },
    });

    return { url: session.url, id: session.id };
  });

const SessionInput = z.object({ session_id: z.string().min(1).max(255) });

export const getOrderByCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SessionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, journey_id, sessions_remaining, order_status")
      .eq("stripe_checkout_session_id", data.session_id)
      .eq("learner_id", userId)
      .maybeSingle();
    return { order: order ?? null };
  });
