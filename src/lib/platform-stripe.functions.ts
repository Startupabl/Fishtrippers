// Server functions for the unified Stripe payment settings card.
// Secret values live in `public.platform_stripe_secrets` (service-role only)
// and are never returned to the client. Non-secret config lives in
// `public.platform_settings`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required.");
}

export type StripeMode = "test" | "live";

export interface PaymentSettings {
  active_stripe_mode: StripeMode;
  stripe_test_publishable_key: string | null;
  stripe_live_publishable_key: string | null;
  platform_fee_pct: number;
  stripe_test_secret_set: boolean;
  stripe_live_secret_set: boolean;
  stripe_checkout_webhook_set: boolean;
  stripe_connect_webhook_set: boolean;
}

export const getPaymentSettings = createServerFn({ method: "GET" })
  .handler(async (): Promise<PaymentSettings> => {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select(
        "active_stripe_mode, stripe_test_publishable_key, stripe_live_publishable_key, platform_fee_pct, stripe_test_secret_set, stripe_live_secret_set, stripe_checkout_webhook_set, stripe_connect_webhook_set",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      active_stripe_mode: (row.active_stripe_mode ?? "test") as StripeMode,
      stripe_test_publishable_key: (row.stripe_test_publishable_key as string | null) ?? null,
      stripe_live_publishable_key: (row.stripe_live_publishable_key as string | null) ?? null,
      platform_fee_pct: Number(row.platform_fee_pct ?? 10),
      stripe_test_secret_set: !!row.stripe_test_secret_set,
      stripe_live_secret_set: !!row.stripe_live_secret_set,
      stripe_checkout_webhook_set: !!row.stripe_checkout_webhook_set,
      stripe_connect_webhook_set: !!row.stripe_connect_webhook_set,
    };
  });

// Public, no-auth fetch of just the platform fee percentage.
// Safe to expose: this is the same number we display in every checkout
// breakdown. Falls back to 14.5 if the row or value is missing.
export const getPublicPlatformFee = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ pct: number }> => {
    try {
      const { data } = await supabaseAdmin
        .from("platform_settings")
        .select("platform_fee_pct")
        .eq("id", 1)
        .maybeSingle();
      const pct = Number(data?.platform_fee_pct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return { pct: 14.5 };
      }
      return { pct };
    } catch {
      return { pct: 14.5 };
    }
  });

// Public, no-auth fetch of just the active Stripe publishable key.
// Safe to expose: publishable keys are designed for client-side use.
export const getActivePublishableKey = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ mode: StripeMode; publishableKey: string }> => {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("active_stripe_mode, stripe_test_publishable_key, stripe_live_publishable_key")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const mode = ((data?.active_stripe_mode ?? "test") === "live" ? "live" : "test") as StripeMode;
    const key =
      mode === "live"
        ? data?.stripe_live_publishable_key
        : data?.stripe_test_publishable_key;
    if (!key) {
      throw new Error(
        `Stripe ${mode} publishable key is not configured. Please contact support.`,
      );
    }
    return { mode, publishableKey: key };
  });

interface UpdatePaymentSettingsInput {
  active_stripe_mode?: StripeMode;
  stripe_test_publishable_key?: string | null;
  stripe_live_publishable_key?: string | null;
  platform_fee_pct?: number;
}

export const updatePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpdatePaymentSettingsInput) => {
    if (data.active_stripe_mode && !["test", "live"].includes(data.active_stripe_mode)) {
      throw new Error("Invalid mode");
    }
    if (
      data.platform_fee_pct !== undefined &&
      (data.platform_fee_pct < 0 || data.platform_fee_pct > 100 || Number.isNaN(data.platform_fee_pct))
    ) {
      throw new Error("Platform fee must be between 0 and 100");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<PaymentSettings> => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {};
    if (data.active_stripe_mode !== undefined) patch.active_stripe_mode = data.active_stripe_mode;
    if (data.stripe_test_publishable_key !== undefined)
      patch.stripe_test_publishable_key = data.stripe_test_publishable_key || null;
    if (data.stripe_live_publishable_key !== undefined)
      patch.stripe_live_publishable_key = data.stripe_live_publishable_key || null;
    if (data.platform_fee_pct !== undefined) patch.platform_fee_pct = data.platform_fee_pct;

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin
        .from("platform_settings")
        .update(patch as never)
        .eq("id", 1);
      if (error) throw new Error(error.message);
    }
    return getPaymentSettings();
  });

// `field` identifies the secret slot. Secret keys are still per-mode
// (test/live). Webhook signing secrets are environment-agnostic and split
// by integration (the Checkout endpoint vs the Connect endpoint), each
// with its own whsec_… from the Stripe Dashboard.
type SecretField =
  | { kind: "secret"; mode: StripeMode }
  | { kind: "webhook"; integration: "checkout" | "connect" };

function resolveCols(field: SecretField): { secretCol: string; flagCol: string } {
  if (field.kind === "secret") {
    return field.mode === "test"
      ? { secretCol: "stripe_test_secret_key", flagCol: "stripe_test_secret_set" }
      : { secretCol: "stripe_live_secret_key", flagCol: "stripe_live_secret_set" };
  }
  return field.integration === "checkout"
    ? {
        secretCol: "stripe_checkout_webhook_secret",
        flagCol: "stripe_checkout_webhook_set",
      }
    : {
        secretCol: "stripe_connect_webhook_secret",
        flagCol: "stripe_connect_webhook_set",
      };
}

interface SaveStripeSecretInput {
  field: SecretField;
  value: string;
}

function validateField(field: unknown): SecretField {
  if (!field || typeof field !== "object") throw new Error("Invalid field");
  const f = field as Record<string, unknown>;
  if (f.kind === "secret") {
    if (f.mode !== "test" && f.mode !== "live") throw new Error("Invalid mode");
    return { kind: "secret", mode: f.mode };
  }
  if (f.kind === "webhook") {
    if (f.integration !== "checkout" && f.integration !== "connect") {
      throw new Error("Invalid integration");
    }
    return { kind: "webhook", integration: f.integration };
  }
  throw new Error("Invalid field");
}

export const saveStripeSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SaveStripeSecretInput) => {
    const field = validateField(data.field);
    if (typeof data.value !== "string" || data.value.length < 4 || data.value.length > 500) {
      throw new Error("Value must be between 4 and 500 characters");
    }
    return { field, value: data.value };
  })
  .handler(async ({ data, context }): Promise<PaymentSettings> => {
    await assertAdmin(context.userId);
    const { secretCol, flagCol } = resolveCols(data.field);

    const { error: secretErr } = await supabaseAdmin
      .from("platform_stripe_secrets")
      .update({ [secretCol]: data.value } as never)
      .eq("id", 1);
    if (secretErr) throw new Error(secretErr.message);

    const { error: flagErr } = await supabaseAdmin
      .from("platform_settings")
      .update({ [flagCol]: true } as never)
      .eq("id", 1);
    if (flagErr) throw new Error(flagErr.message);

    return getPaymentSettings();
  });

export const clearStripeSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { field: SecretField }) => ({ field: validateField(data.field) }))
  .handler(async ({ data, context }): Promise<PaymentSettings> => {
    await assertAdmin(context.userId);
    const { secretCol, flagCol } = resolveCols(data.field);

    await supabaseAdmin
      .from("platform_stripe_secrets")
      .update({ [secretCol]: null } as never)
      .eq("id", 1);
    await supabaseAdmin
      .from("platform_settings")
      .update({ [flagCol]: false } as never)
      .eq("id", 1);

    return getPaymentSettings();
  });
