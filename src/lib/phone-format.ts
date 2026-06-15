import { COUNTRIES, flagEmoji, type Country } from "./countries";

export interface ParsedPhone {
  iso2: string;
  dialCode: string;
  national: string; // digits only after dial code
  e164: string;
}

/** Best-effort parse of an E.164 string into a country + national digits. */
export function parseE164(value: string | null | undefined): ParsedPhone | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  // longest-prefix match against known dial codes
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const match = sorted.find((c) => digits.startsWith(c.dialCode));
  if (!match) return null;
  return {
    iso2: match.iso2,
    dialCode: match.dialCode,
    national: digits.slice(match.dialCode.length),
    e164: `+${digits}`,
  };
}

/** Pretty-print the national portion. Light formatting only. */
export function formatNational(iso2: string, national: string): string {
  const d = national.replace(/[^\d]/g, "");
  if (iso2 === "US" || iso2 === "CA") {
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  // Default: space every 3 digits
  return d.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

/** Build display string: "🇺🇸 +1 (555) 123-4567" */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const p = parseE164(value);
  if (!p) return value ?? "—";
  return `${flagEmoji(p.iso2)} +${p.dialCode} ${formatNational(p.iso2, p.national)}`;
}

/** Concat country + local into E.164. Returns null if empty/invalid. */
export function buildE164(country: Country, local: string): string | null {
  const d = local.replace(/[^\d]/g, "");
  if (!d) return null;
  const full = `${country.dialCode}${d}`;
  if (full.length < 8 || full.length > 15) return null;
  return `+${full}`;
}
