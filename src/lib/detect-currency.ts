import type { CurrencyCode } from "@/stores/useCurrencyStore";

// Locale/timezone fallback used when the IP lookup is unavailable.
const LOCALE_MAP: Record<string, CurrencyCode> = {
  GB: "GBP", IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
  NL: "EUR", PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
  CA: "CAD", AU: "AUD", NZ: "NZD", US: "USD",
  MX: "MXN", BR: "BRL", CR: "CRC", CH: "CHF", SG: "SGD",
  JP: "JPY", CN: "CNY", TH: "THB", PH: "PHP", ID: "IDR", MY: "MYR",
};

const TZ_MAP: Array<[RegExp, CurrencyCode]> = [
  [/^Europe\/London/, "GBP"],
  [/^Europe\//, "EUR"],
  [/^America\/Toronto|^America\/Vancouver|^America\/Edmonton|^America\/Halifax/, "CAD"],
  [/^America\/Mexico/, "MXN"],
  [/^America\/Costa_Rica/, "CRC"],
  [/^America\/Sao_Paulo|^America\/Bahia|^America\/Fortaleza/, "BRL"],
  [/^Australia\//, "AUD"],
  [/^Pacific\/Auckland/, "NZD"],
  [/^Asia\/Tokyo/, "JPY"],
  [/^Asia\/Shanghai|^Asia\/Hong_Kong/, "CNY"],
  [/^Asia\/Bangkok/, "THB"],
  [/^Asia\/Manila/, "PHP"],
  [/^Asia\/Jakarta|^Asia\/Makassar/, "IDR"],
  [/^Asia\/Kuala_Lumpur|^Asia\/Singapore/, "SGD"],
  [/^America\//, "USD"],
];

export function detectCurrencyLocal(): CurrencyCode {
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

/** Silent IP-based detection; falls back to locale/timezone if the lookup fails. */
export async function detectCurrencyByIp(allowedCodes: Set<string>): Promise<CurrencyCode> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const json: any = await res.json();
      const currency = String(json?.currency ?? "").toUpperCase();
      if (currency && allowedCodes.has(currency)) return currency;
      const country = String(json?.country_code ?? "").toUpperCase();
      const fromCountry = LOCALE_MAP[country];
      if (fromCountry && allowedCodes.has(fromCountry)) return fromCountry;
    }
  } catch {
    /* ignore */
  }
  const local = detectCurrencyLocal();
  return allowedCodes.has(local) ? local : "USD";
}

// Backwards-compat alias for any older callers.
export const detectCurrency = detectCurrencyLocal;
