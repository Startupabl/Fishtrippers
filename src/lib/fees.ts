// Forward and reverse fee math. All helpers accept an optional `rate` so
// callers can pass the live admin-configured fee. When omitted, falls back
// to PLATFORM_FEE_RATE (0.145) for backward compatibility and SSR safety.
import { PLATFORM_FEE_RATE } from "./platform-fee";

export const SERVICE_FEE_PCT = PLATFORM_FEE_RATE;

export interface FeeBreakdown {
  grossMinor: number;
  feeMinor: number;
  payoutMinor: number;
}

export function computeFeeBreakdown(
  grossMinor: number,
  rate: number = PLATFORM_FEE_RATE,
): FeeBreakdown {
  const feeMinor = Math.round(grossMinor * rate);
  return { grossMinor, feeMinor, payoutMinor: grossMinor - feeMinor };
}

export function feePctLabel(rate: number = PLATFORM_FEE_RATE): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}
