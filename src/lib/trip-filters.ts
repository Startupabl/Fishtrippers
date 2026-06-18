// Shared filter option lists for the search directory.
// Slugs are stored in trip_packages.techniques / target_species arrays.
import { SPECIES_LIST, speciesIdFromLabel, FISHING_TECHNIQUES } from "@/lib/operators.shared";

export type FilterOption = { slug: string; label: string };

export const DURATION_OPTIONS: { value: string; label: string }[] = Array.from(
  { length: 14 },
  (_, i) => {
    const h = i + 1;
    return { value: String(h), label: `${h} hr${h === 1 ? "" : "s"}` };
  },
);

export const DEPARTURE_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "05:00", label: "5:00 AM" },
  { value: "05:30", label: "5:30 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "06:30", label: "6:30 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "07:30", label: "7:30 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "18:00", label: "6:00 PM" },
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
