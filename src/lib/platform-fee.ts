// Default/fallback platform fee rate. The live rate is stored in
// public.platform_settings.platform_fee_pct (see platform-fee.server.ts).
// This constant is only used as a fallback when the DB value is unavailable
// or when a synchronous call site has no access to the live value (e.g.
// initial render before the usePlatformFee query resolves).
export const PLATFORM_FEE_RATE = 0.145;

export function platformFeeMinor(totalMinor: number, rate: number = PLATFORM_FEE_RATE): number {
  return Math.round(totalMinor * rate);
}

export function aidePayoutMinor(totalMinor: number, rate: number = PLATFORM_FEE_RATE): number {
  return totalMinor - platformFeeMinor(totalMinor, rate);
}

