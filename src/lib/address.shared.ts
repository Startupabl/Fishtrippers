// Best-effort fallback when Google's structured addressComponents don't
// surface a locality (e.g. rural area, custom POI), or when an older record
// was saved before structured fields were captured. Parses the last 2-4
// comma-separated segments of a formatted address:
//   "1850 Ocean Front St, San Diego, CA 92107, USA"
//   → { city: "San Diego", state: "CA", country: "USA" }
//   "Tampa, FL"
//   → { city: "Tampa", state: "FL", country: null }
export function parseCityStateCountry(
  address: string | null | undefined,
): { city: string | null; state: string | null; country: string | null } {
  if (!address) return { city: null, state: null, country: null };
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { city: null, state: null, country: null };
  const hasCountry = parts.length >= 4;
  const country = hasCountry ? parts[parts.length - 1] : null;
  const stateZipIdx = hasCountry ? parts.length - 2 : parts.length - 1;
  const cityIdx = stateZipIdx - 1;
  if (cityIdx < 0) return { city: null, state: null, country };
  const city = parts[cityIdx] || null;
  const stateZip = parts[stateZipIdx] || "";
  const stateMatch = stateZip.match(/^([A-Za-z]{2,})\b/);
  const state = stateMatch ? stateMatch[1].toUpperCase() : null;
  return { city, state, country };
}
