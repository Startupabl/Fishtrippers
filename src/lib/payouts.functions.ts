import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripeRequest } from "@/lib/stripe.server";

// SECURITY: never derive the redirect origin from request headers (Origin/Referer
// can be forged by non-browser clients holding a valid bearer token, which would
// silently redirect users to an attacker domain after Stripe Connect onboarding).
// Read the canonical app origin from a trusted server env var only.
function resolveOrigin(): string {
  return process.env.APP_URL ?? "https://fishtrippers.com";
}

export const startStripeConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id, email, country")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);

    let accountId = profile?.stripe_connect_id ?? null;

    if (!accountId) {
      const acct = await stripeRequest<{ id: string }>("/v1/accounts", {
        method: "POST",
        params: {
          type: "express",
          "capabilities[transfers][requested]": "true",
          "capabilities[card_payments][requested]": "true",
          country: profile?.country || "HU",
          ...(profile?.email ? { email: profile.email } : {}),
        },
      });
      accountId = acct.id;

      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_connect_id: accountId })
        .eq("id", userId);
      if (uErr) throw new Error(uErr.message);
    }

    const origin = resolveOrigin();
    const link = await stripeRequest<{ url: string }>("/v1/account_links", {
      method: "POST",
      params: {
        account: accountId,
        refresh_url: `${origin}/settings/billing?stripe=refresh`,
        return_url: `${origin}/settings/billing?stripe=return`,
        type: "account_onboarding",
      },
    });

    return { url: link.url, accountId };
  });

export const finalizeStripeConnectReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id, is_payout_ready")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile?.stripe_connect_id) {
      return { connected: false, reason: "no_account" as const };
    }
    const acct = await stripeRequest<{
      id: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
    }>(`/v1/accounts/${encodeURIComponent(profile.stripe_connect_id)}`, {
      method: "GET",
    });
    const ready = !!acct.charges_enabled && !!acct.payouts_enabled && !!acct.details_submitted;
    if (ready && !profile.is_payout_ready) {
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ is_payout_ready: true })
        .eq("id", userId);
      if (uErr) throw new Error(uErr.message);
    }
    return {
      connected: ready,
      accountId: profile.stripe_connect_id,
      reason: ready ? null : ("incomplete" as const),
    };
  });

export const getMyStripeIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_connect_id, is_payout_ready")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      stripe_customer_id: data?.stripe_customer_id ?? null,
      stripe_connect_id: data?.stripe_connect_id ?? null,
      is_payout_ready: !!data?.is_payout_ready,
    };
  });
