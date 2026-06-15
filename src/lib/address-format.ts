import { countryByIso2, flagEmoji } from "./countries";

export interface AddressFields {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null; // ISO-2
}

export function hasAnyAddress(a: AddressFields): boolean {
  return Boolean(
    a.address_line1 || a.address_line2 || a.city || a.state_province || a.postal_code || a.country,
  );
}

/** Multi-line mailing block. Returns array of lines (skip empties). */
export function formatAddressLines(a: AddressFields): string[] {
  const lines: string[] = [];
  if (a.address_line1) lines.push(a.address_line1);
  if (a.address_line2) lines.push(a.address_line2);
  const cityLine = [
    a.city,
    [a.state_province, a.postal_code].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (a.country) {
    const c = countryByIso2(a.country);
    lines.push(`${flagEmoji(a.country)} ${c?.name ?? a.country}`);
  }
  return lines;
}

/** Compact one-line variant for tables/logs. */
export function formatAddressInline(a: AddressFields): string {
  const parts = [a.address_line1, a.city, a.state_province].filter(Boolean) as string[];
  if (a.country) parts.push(flagEmoji(a.country));
  return parts.join(", ");
}
