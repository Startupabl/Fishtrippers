// IANA timezone helpers. The browser/Node `Intl` API ships with the IANA
// Time Zone Database and stays current automatically.

import { fromZonedTime } from "date-fns-tz";

/**
 * Convert a wall-clock date+time entered in a specific IANA zone into a UTC
 * ISO string suitable for storing in the database.
 *
 * @param date "yyyy-mm-dd"
 * @param time "HH:mm"
 * @param tz   IANA zone (e.g. "America/New_York")
 */
export function zonedWallTimeToUtcISO(date: string, time: string, tz: string): string {
  return fromZonedTime(`${date}T${time}:00`, tz).toISOString();
}

/**
 * Format a UTC ISO timestamp for display in the given IANA zone.
 */
export function formatUtcInZone(
  utcIso: string,
  tz: string,
  opts: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: tz }).format(
    new Date(utcIso),
  );
}

/**
 * Short timezone abbreviation (e.g. "EDT", "PST") for a given IANA zone.
 */
export function tzAbbrev(tz: string, when: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(when);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/**
 * Resolve the viewer's IANA zone, preferring a stored profile value and
 * falling back to the browser's detected zone.
 */
export function resolveViewerTimezone(profileTz: string | null | undefined): string {
  if (profileTz && profileTz.trim()) return profileTz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
