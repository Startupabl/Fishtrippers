import { createServerFn } from "@tanstack/react-start";

const TTL_MS = 12 * 60 * 60 * 1000; // 12h
let cache: { at: number; rates: Record<string, number> } | null = null;

const FALLBACK: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.37, AUD: 1.52,
};

export const getFxRates = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < TTL_MS) return { rates: cache.rates, source: "cache" };
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,CAD,AUD",
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const json: any = await res.json();
    const rates: Record<string, number> = { USD: 1, ...(json?.rates ?? {}) };
    cache = { at: Date.now(), rates };
    return { rates, source: "live" };
  } catch (e) {
    return { rates: FALLBACK, source: "fallback" };
  }
});
