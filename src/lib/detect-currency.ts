import type { CurrencyCode } from "@/stores/useCurrencyStore";

// Coarse locale + timezone heuristic. No network call.
const LOCALE_MAP: Record<string, CurrencyCode> = {
  GB: "GBP",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
  CA: "CAD",
  AU: "AUD",
  NZ: "AUD",
  US: "USD",
};

const TZ_MAP: Array<[RegExp, CurrencyCode]> = [
  [/^Europe\/London/, "GBP"],
  [/^Europe\//, "EUR"],
  [/^America\/Toronto|^America\/Vancouver|^America\/Edmonton|^America\/Halifax/, "CAD"],
  [/^Australia\//, "AUD"],
  [/^Pacific\/Auckland/, "AUD"],
  [/^America\//, "USD"],
];

export function detectCurrency(): CurrencyCode {
  if (typeof navigator === "undefined") return "USD";
  const lang = navigator.language || "en-US";
  const region = lang.split("-")[1]?.toUpperCase();
  if (region && LOCALE_MAP[region]) return LOCALE_MAP[region];
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    for (const [re, code] of TZ_MAP) if (re.test(tz)) return code;
  } catch {
    /* ignore */
  }
  return "USD";
}
