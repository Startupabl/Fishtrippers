// Server-only helper that reads the live platform fee from platform_settings.
// Falls back to 0.145 (14.5%) if the row is missing or the read fails.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const FALLBACK_PLATFORM_FEE_RATE = 0.145;

export async function getPlatformFeeRate(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("platform_fee_pct")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data || data.platform_fee_pct == null) {
      return FALLBACK_PLATFORM_FEE_RATE;
    }
    const pct = Number(data.platform_fee_pct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return FALLBACK_PLATFORM_FEE_RATE;
    }
    return pct / 100;
  } catch {
    return FALLBACK_PLATFORM_FEE_RATE;
  }
}
