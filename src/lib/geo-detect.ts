// Best-effort client-side IP geolocation. Returns ISO-2 country code or null.
// Uses a free no-auth endpoint with a short timeout so the UI never stalls.

export async function detectCountryByIp(timeoutMs = 2000): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { country_code?: string; country?: string };
    const code = (data.country_code || data.country || "").toString().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}
