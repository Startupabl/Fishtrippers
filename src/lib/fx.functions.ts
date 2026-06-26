import { createServerFn } from "@tanstack/react-start";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
let cache: { at: number; rates: Record<string, number> } | null = null;

const FALLBACK: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.37, AUD: 1.52,
  MXN: 17.2, BRL: 5.1, CRC: 520, CHF: 0.88, NZD: 1.65,
  SGD: 1.34, JPY: 156, CNY: 7.2, THB: 36, PHP: 58,
  IDR: 16000, MYR: 4.7,
};

const SYMBOLS = "EUR,GBP,CAD,AUD,MXN,BRL,CRC,CHF,NZD,SGD,JPY,CNY,THB,PHP,IDR,MYR";

export const getFxRates = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < TTL_MS) return { rates: cache.rates, source: "cache" };
  const rates: Record<string, number> = { USD: 1 };
  // Primary: Frankfurter (ECB-derived, free, no key).
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${SYMBOLS}`,
      { headers: { accept: "application/json" } },
    );
    if (res.ok) {
      const json: any = await res.json();
      Object.assign(rates, json?.rates ?? {});
    }
  } catch {
    /* ignore */
  }
  // Secondary: open.er-api.com fills in any codes Frankfurter doesn't carry
  // (CRC, PHP, etc.).
  try {
    const missing = SYMBOLS.split(",").filter((c) => rates[c] === undefined);
    if (missing.length > 0) {
      const res2 = await fetch("https://open.er-api.com/v6/latest/USD", {
        headers: { accept: "application/json" },
      });
      if (res2.ok) {
        const json: any = await res2.json();
        const r2 = json?.rates ?? {};
        for (const code of missing) {
          if (typeof r2[code] === "number" && r2[code] > 0) rates[code] = r2[code];
        }
      }
    }
  } catch {
    /* ignore */
  }
  // Fill any still-missing codes with hardcoded fallback so UI never breaks.
  for (const [code, v] of Object.entries(FALLBACK)) {
    if (rates[code] === undefined) rates[code] = v;
  }
  cache = { at: Date.now(), rates };
  return { rates, source: "live" };
});
