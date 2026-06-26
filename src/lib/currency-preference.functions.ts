import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCurrencyPreference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("currency_preference")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { currency: (data?.currency_preference ?? null) as string | null };
  });

export const updateCurrencyPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { currency: string }) => {
    const code = String(input?.currency ?? "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new Error("Invalid currency code");
    return { currency: code };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ currency_preference: data.currency })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
