// Server functions for per-listing promo codes.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PromoCodeRow {
  id: string;
  journey_id: string | null;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const PROMO_COLS =
  "id, journey_id, code, discount_type, discount_value, expires_at, is_active, created_at";

const ListInput = z.object({ journeyId: z.string().uuid() });

const CreateInput = z.object({
  journeyId: z.string().uuid(),
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive().max(100000),
  expiresAt: z.string().datetime().nullable().optional(),
});

const IdInput = z.object({ id: z.string().uuid() });
const ToggleInput = z.object({ id: z.string().uuid(), isActive: z.boolean() });

async function assertOwnsJourney(
  supabase: any,
  userId: string,
  journeyId: string,
) {
  const { data, error } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journeyId)
    .eq("mentor_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Listing not found");
}

export const listPromoCodesForJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInput.parse(input))
  .handler(async ({ data, context }): Promise<PromoCodeRow[]> => {
    const { supabase, userId } = context;
    await assertOwnsJourney(supabase, userId, data.journeyId);
    const { data: rows, error } = await supabase
      .from("promo_codes")
      .select(PROMO_COLS)
      .eq("journey_id", data.journeyId)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as PromoCodeRow[];
  });

export const createPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }): Promise<PromoCodeRow> => {
    const { supabase, userId } = context;
    await assertOwnsJourney(supabase, userId, data.journeyId);
    const code = data.code.toUpperCase();
    const { data: row, error } = await supabase
      .from("promo_codes")
      .insert({
        owner_id: userId,
        journey_id: data.journeyId,
        code,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        expires_at: data.expiresAt ?? null,
        is_active: true,
      })
      .select(PROMO_COLS)
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("That code already exists for this listing.");
      }
      throw new Error(error.message);
    }
    return row as unknown as PromoCodeRow;
  });

export const deletePromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: data.isActive })
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- Learner-facing validator for the checkout page -------------------------

const ValidateInput = z.object({
  bookingId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i),
});

export interface ValidatedPromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  /** percent: 1-100. fixed: amount in MAJOR currency units (dollars). */
  discount_value: number;
  expires_at: string | null;
}

export type ValidatePromoResult =
  | { ok: true; promo: ValidatedPromoCode }
  | { ok: false; error: string };

export const validatePromoCodeForCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ValidateInput.parse(input))
  .handler(async ({ data, context }): Promise<ValidatePromoResult> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { userId } = context;

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, learner_id, course_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr || !booking) return { ok: false, error: "Booking not found." };
    if (booking.learner_id !== userId)
      return { ok: false, error: "Not authorized." };
    if (!booking.course_id)
      return { ok: false, error: "This booking has no course attached." };

    const code = data.code.trim().toUpperCase();
    const { data: rows, error: pErr } = await supabaseAdmin
      .from("promo_codes")
      .select(PROMO_COLS)
      .eq("journey_id", booking.course_id)
      .ilike("code", code)
      .limit(1);
    if (pErr) return { ok: false, error: pErr.message };
    const row = rows?.[0] as PromoCodeRow | undefined;
    if (!row) return { ok: false, error: "That code isn't valid for this course." };
    if (!row.is_active)
      return { ok: false, error: "This promo code is no longer active." };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
      return { ok: false, error: "This promo code has expired." };

    return {
      ok: true,
      promo: {
        id: row.id,
        code: row.code,
        discount_type: row.discount_type,
        discount_value: row.discount_value,
        expires_at: row.expires_at,
      },
    };
  });

/**
 * Server-side pricing math for an applied promo code. Mirrors the
 * client-side preview so the learner sees the same numbers we will charge.
 * `discount_value` for `fixed` is in MAJOR units (dollars) — convert to minor.
 */
export function applyPromoToSubtotal(
  subtotalMinor: number,
  promo: Pick<ValidatedPromoCode, "discount_type" | "discount_value">,
): { discountMinor: number; newSubtotalMinor: number } {
  let discountMinor = 0;
  if (promo.discount_type === "percent") {
    const pct = Math.max(0, Math.min(100, promo.discount_value));
    discountMinor = Math.round(subtotalMinor * (pct / 100));
  } else {
    discountMinor = Math.max(0, Math.round(promo.discount_value * 100));
  }
  discountMinor = Math.min(discountMinor, subtotalMinor);
  return {
    discountMinor,
    newSubtotalMinor: subtotalMinor - discountMinor,
  };
}

