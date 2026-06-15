// Server-only Stripe client.
// All Stripe API calls are made DIRECTLY to api.stripe.com using the secret
// key stored in `public.platform_stripe_secrets` (managed by Admin → Payments).
// The active mode (test / live) is read from `public.platform_settings.active_stripe_mode`.
// Never import this from client/component files.

import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRIPE_API_BASE = "https://api.stripe.com";

export type StripeMode = "test" | "live";

async function getActiveMode(): Promise<StripeMode> {
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("active_stripe_mode")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Failed to read platform_settings: ${error.message}`);
  const mode = (data?.active_stripe_mode ?? "test") as StripeMode;
  return mode === "live" ? "live" : "test";
}

async function resolveStripeSecret(): Promise<{ key: string; mode: StripeMode }> {
  const mode = await getActiveMode();
  const col = mode === "live" ? "stripe_live_secret_key" : "stripe_test_secret_key";
  const { data, error } = await supabaseAdmin
    .from("platform_stripe_secrets")
    .select(col)
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Failed to read platform_stripe_secrets: ${error.message}`);
  const key = (data as Record<string, string | null> | null)?.[col] ?? null;
  if (!key) {
    throw new Error(
      `Stripe ${mode} secret key is not configured. Add it in Admin → Payments → Stripe.`,
    );
  }
  const expectedPrefix = mode === "live" ? "sk_live_" : "sk_test_";
  if (!key.startsWith(expectedPrefix)) {
    console.warn(
      `[stripe] active mode is "${mode}" but secret key prefix does not match (expected ${expectedPrefix}).`,
    );
  }
  return { key, mode };
}

/**
 * Resolve the configured webhook signing secrets. Returns every secret the
 * platform currently has on file (Checkout endpoint + Connect endpoint).
 * The webhook handler tries each one and accepts the first that verifies,
 * so a single endpoint can safely receive events from either Stripe webhook
 * configuration without breaking the other.
 */
export async function resolveWebhookSecretCandidates(
  env?: "sandbox" | "live" | null,
): Promise<string[]> {
  const candidates: string[] = [];

  const { data, error } = await supabaseAdmin
    .from("platform_stripe_secrets")
    .select("stripe_checkout_webhook_secret, stripe_connect_webhook_secret")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[stripe] resolveWebhookSecretCandidates failed", error);
  } else {
    const row = (data ?? {}) as {
      stripe_checkout_webhook_secret?: string | null;
      stripe_connect_webhook_secret?: string | null;
    };
    candidates.push(
      ...[row.stripe_checkout_webhook_secret, row.stripe_connect_webhook_secret].filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
    );
  }

  // Platform-managed webhook secrets (set as server env vars by enable_stripe_payments).
  if (env === "sandbox" || env == null) {
    const s = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
    if (s) candidates.push(s);
  }
  if (env === "live" || env == null) {
    const s = process.env.PAYMENTS_LIVE_WEBHOOK_SECRET;
    if (s) candidates.push(s);
  }

  return Array.from(new Set(candidates));
}

function encodeForm(params: Record<string, string | number | undefined | null>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  return usp.toString();
}

/**
 * Generic Stripe request helper. Exported so other server-only modules
 * (e.g. payouts.functions.ts) can route through the same key resolver.
 */
export async function stripeRequest<T>(
  path: string,
  init: {
    method: "GET" | "POST";
    params?: Record<string, string | number | undefined | null>;
    idempotencyKey?: string;
  },
): Promise<T> {
  const { key } = await resolveStripeSecret();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };
  if (init.idempotencyKey) {
    // Stripe truncates Idempotency-Key beyond 255 chars; trim defensively.
    headers["Idempotency-Key"] = init.idempotencyKey.slice(0, 255);
  }
  let body: string | undefined;
  let url = `${STRIPE_API_BASE}${path}`;

  if (init.method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = encodeForm(init.params ?? {});
  } else if (init.params) {
    const qs = encodeForm(init.params);
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, { method: init.method, headers, body });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe ${path} failed [${res.status}]: ${text}`);
  }
  return JSON.parse(text) as T;
}

async function stripePost<T>(
  path: string,
  params: Record<string, string | number | undefined | null>,
  idempotencyKey?: string,
): Promise<T> {
  return stripeRequest<T>(path, { method: "POST", params, idempotencyKey });
}

async function stripeGet<T>(path: string, params?: Record<string, string | number | undefined | null>): Promise<T> {
  return stripeRequest<T>(path, { method: "GET", params });
}

export async function retrievePaymentIntent(
  id: string,
): Promise<{ latest_charge?: { receipt_url?: string | null } | string | null }> {
  return stripeGet(`/v1/payment_intents/${encodeURIComponent(id)}`, {
    "expand[]": "latest_charge",
  });
}

export async function createStripeProduct(args: {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<{ id: string }> {
  const body: Record<string, string> = { name: args.name };
  if (args.description) body.description = args.description.slice(0, 400);
  if (args.metadata) {
    for (const [k, v] of Object.entries(args.metadata)) {
      body[`metadata[${k}]`] = v;
    }
  }
  return stripePost<{ id: string }>("/v1/products", body, args.idempotencyKey);
}

export async function createStripePrice(args: {
  product: string;
  unit_amount: number; // minor units
  currency: string;
  idempotencyKey?: string;
}): Promise<{ id: string }> {
  return stripePost<{ id: string }>(
    "/v1/prices",
    {
      product: args.product,
      unit_amount: args.unit_amount,
      currency: args.currency.toLowerCase(),
    },
    args.idempotencyKey,
  );
}

export async function createCheckoutSession(args: {
  price: string;
  success_url: string;
  cancel_url: string;
  client_reference_id?: string;
  customer_email?: string;
  metadata: Record<string, string>;
  application_fee_amount?: number; // minor units, integer
  transfer_destination?: string; // Stripe Connect account id (acct_...)
  idempotencyKey?: string;
}): Promise<{ id: string; url: string }> {
  const params: Record<string, string | number> = {
    mode: "payment",
    "line_items[0][price]": args.price,
    "line_items[0][quantity]": 1,
    success_url: args.success_url,
    cancel_url: args.cancel_url,
  };
  if (args.client_reference_id) params.client_reference_id = args.client_reference_id;
  if (args.customer_email) params.customer_email = args.customer_email;
  for (const [k, v] of Object.entries(args.metadata)) {
    params[`metadata[${k}]`] = v;
    // Mirror onto PaymentIntent so webhooks reading payment_intent.metadata also resolve.
    params[`payment_intent_data[metadata][${k}]`] = v;
  }
  if (args.transfer_destination) {
    if (!/^acct_[A-Za-z0-9]+$/.test(args.transfer_destination)) {
      throw new Error("Invalid Stripe Connect account id.");
    }
    params["payment_intent_data[transfer_data][destination]"] = args.transfer_destination;
  }
  if (args.application_fee_amount !== undefined) {
    if (!Number.isInteger(args.application_fee_amount) || args.application_fee_amount < 0) {
      throw new Error("application_fee_amount must be a non-negative integer in minor units.");
    }
    params["payment_intent_data[application_fee_amount]"] = args.application_fee_amount;
  }
  return stripePost<{ id: string; url: string }>(
    "/v1/checkout/sessions",
    params,
    args.idempotencyKey,
  );
}

export async function createStripeLoginLink(accountId: string): Promise<{ url: string }> {
  return stripePost<{ url: string }>(
    `/v1/accounts/${encodeURIComponent(accountId)}/login_links`,
    {},
  );
}

/**
 * Verify a Stripe webhook signature.
 * Header format: `t=<timestamp>,v1=<signature>` (multiple v1 entries allowed).
 */
export function verifyStripeWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  const { rawBody, signatureHeader, secret, toleranceSeconds = 300 } = args;
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.trim(), rest.join("=").trim()];
    }),
  ) as Record<string, string>;

  const t = parts.t;
  const v1Signatures = signatureHeader
    .split(",")
    .filter((p) => p.trim().startsWith("v1="))
    .map((p) => p.trim().slice(3));

  if (!t || v1Signatures.length === 0) return false;

  const tsNum = Number(t);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > toleranceSeconds) return false;

  const payload = `${t}.${rawBody}`;
  return v1Signatures.some((sig) => safeHmacEquals(payload, sig, secret));
}

function safeHmacEquals(payload: string, expectedHex: string, secret: string) {
  // Node crypto is available in the Worker via nodejs_compat, but only via
  // ESM `import` — `require` is not defined in the ESM bundle.
  const computed = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  if (computed.length !== expectedHex.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(expectedHex, "hex"),
    );
  } catch {
    return false;
  }
}
