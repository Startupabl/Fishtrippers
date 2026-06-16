import type { CurrencyCode } from "@/stores/useCurrencyStore";

export interface CurrencyMeta {
  code: CurrencyCode;
  label: string;
  symbol: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", label: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", label: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "CAD", label: "Canadian Dollar", symbol: "$", flag: "🇨🇦" },
  { code: "AUD", label: "Australian Dollar", symbol: "$", flag: "🇦🇺" },
];

// Live FX rates (base = USD). Hydrated by useFxRates() on app boot;
// falls back to these static values when the API is unreachable.
export const FX_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.52,
};

export function setLiveFxRates(rates: Record<string, number>) {
  for (const code of Object.keys(FX_RATES) as CurrencyCode[]) {
    const v = rates[code];
    if (typeof v === "number" && v > 0) FX_RATES[code] = v;
  }
}

export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (from === to) return amountMinor;
  const usd = amountMinor / FX_RATES[from];
  return Math.round(usd * FX_RATES[to]);
}

export function getCurrencyMeta(code: CurrencyCode): CurrencyMeta {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}
