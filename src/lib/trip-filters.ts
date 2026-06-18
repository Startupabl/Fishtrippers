// Shared filter option lists for the search directory.
// Slugs are stored in trip_packages.techniques / target_species arrays.
import { SPECIES_LIST, speciesIdFromLabel, FISHING_TECHNIQUES } from "@/lib/operators.shared";

export type FilterOption = { slug: string; label: string };

// Duration buckets based on trip hours (trip_packages.duration_minutes).
// Half Day: 1–5 hrs, Full Day: 6–9 hrs, Extended Day: 10+ hrs.
export type DurationBucket = {
  value: "half" | "full" | "extended";
  label: string;
  minMinutes: number;
  maxMinutes: number | null;
};

export const DURATION_BUCKETS: DurationBucket[] = [
  { value: "half", label: "Half Day (1–5 hrs)", minMinutes: 1, maxMinutes: 5 * 60 },
  { value: "full", label: "Full Day (6–9 hrs)", minMinutes: 5 * 60 + 1, maxMinutes: 9 * 60 },
  { value: "extended", label: "Extended Day (10–14 hrs)", minMinutes: 9 * 60 + 1, maxMinutes: null },
];

// Departure time windows based on trip_packages.start_time (HH:MM[:SS]).
// Compared lexicographically against "HH:MM:SS" stored values.
export type DepartureBucket = {
  value: "morning" | "afternoon" | "evening";
  label: string;
  startTime: string; // inclusive (HH:MM:SS)
  endTime: string;   // exclusive (HH:MM:SS)
};

export const DEPARTURE_BUCKETS: DepartureBucket[] = [
  { value: "morning",   label: "Morning (5 AM – 11 AM)",      startTime: "05:00:00", endTime: "11:00:00" },
  { value: "afternoon", label: "Afternoon (11 AM – 4 PM)",    startTime: "11:00:00", endTime: "16:00:00" },
  { value: "evening",   label: "Evening / Night (4 PM – 10 PM)", startTime: "16:00:00", endTime: "22:00:00" },
];


export const PRICE_PRESETS: { id: string; label: string; min: number; max: number }[] = [
  { id: "lt500", label: "Under $500", min: 0, max: 500 },
  { id: "500-1000", label: "$500 – $1,000", min: 500, max: 1000 },
  { id: "1000-2000", label: "$1,000 – $2,000", min: 1000, max: 2000 },
  { id: "2000plus", label: "$2,000+", min: 2000, max: 5000 },
];

export const PRICE_MIN = 0;
export const PRICE_MAX = 5000;
export const PRICE_STEP = 50;

export const TECHNIQUE_OPTIONS: FilterOption[] = FISHING_TECHNIQUES.map((t) => ({
  slug: t,
  label: t,
}));

export const SPECIES_OPTIONS: FilterOption[] = SPECIES_LIST
  .map((label) => ({ slug: speciesIdFromLabel(label), label }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function csvToList(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export function listToCsv(list: string[]): string {
  return list.join(",");
}
