// Shared schemas + template catalog for the operator Trip Catalog step.
import { z } from "zod";
import type { PrimaryCategory } from "./operators.shared";

export const DURATION_OPTIONS = [
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
  { value: 480, label: "8 hours" },
  { value: 720, label: "12 hours" },
] as const;

export interface TripTemplate {
  key: string;
  title: string;
  defaultDurationMinutes: number;
  blurb: string;
}

export const TRIP_TEMPLATES: Record<PrimaryCategory, TripTemplate[]> = {
  offshore: [
    { key: "offshore_half_day", title: "Half-Day Deep Sea", defaultDurationMinutes: 240, blurb: "4-hour offshore run targeting pelagics close to the shelf." },
    { key: "offshore_full_day", title: "Full-Day Big Game", defaultDurationMinutes: 480, blurb: "Full day chasing tuna, marlin and other trophy species." },
  ],
  inshore: [
    { key: "inshore_flats_4h", title: "4-Hour Flats Trip", defaultDurationMinutes: 240, blurb: "Half-day flats fishing for redfish, trout and snook." },
    { key: "inshore_bay_6h", title: "6-Hour Bay Exploration", defaultDurationMinutes: 360, blurb: "Extended inshore run exploring bays and back-country." },
  ],
  freshwater: [
    { key: "fresh_morning_bass", title: "Morning Bass Run", defaultDurationMinutes: 240, blurb: "Early-morning bass session on prime lake structure." },
    { key: "fresh_full_day_lake", title: "Full-Day Lake Tournament", defaultDurationMinutes: 480, blurb: "Tournament-style full day on the lake." },
  ],
  fly_fishing: [
    { key: "fly_fundamentals", title: "Fly Fishing Fundamentals", defaultDurationMinutes: 240, blurb: "Beginner-friendly intro to fly fishing — casting + reading water." },
    { key: "fly_trout_stream", title: "Trout Stream Expedition", defaultDurationMinutes: 480, blurb: "Walk-and-wade trout fishing on a classic stream." },
  ],
  spearfishing: [
    { key: "spear_reef_day", title: "Reef Spearfishing Day", defaultDurationMinutes: 360, blurb: "Free-dive spearfishing on inshore reefs." },
    { key: "spear_blue_water", title: "Blue Water Spearfishing", defaultDurationMinutes: 480, blurb: "Open-water spearfishing for pelagic species." },
  ],
};

// HH:MM 24-hour clock
const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)")
  .nullable()
  .optional();

export const BOOKING_TYPE_OPTIONS = [
  { value: "instant_book", label: "Instant Book", hint: "Buyers see live calendar and book immediately." },
  { value: "request_to_book", label: "Request to Book", hint: "Buyers send a request; you approve before payment." },
] as const;

export type TripType =
  | "private_charter"
  | "shared_tour"
  | "private_trip"
  | "small_group_trip";

export const isSharedTripType = (t: TripType | null | undefined): boolean =>
  t === "shared_tour" || t === "small_group_trip";
export const isPrivateTripType = (t: TripType | null | undefined): boolean =>
  t === "private_charter" || t === "private_trip";

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  private_charter: "Private Charter",
  shared_tour: "Shared Tour",
  private_trip: "Private Trip",
  small_group_trip: "Small Group Trip",
};

const CHARTER_TRIP_TYPE_OPTIONS = [
  {
    value: "private_charter",
    label: "Private Charter (Book the entire boat)",
    hint: "One group books the whole boat. Set a base price plus an extra-angler fee.",
  },
  {
    value: "shared_tour",
    label: "Shared Tour (Book per seat)",
    hint: "Guests book individual seats. Set a price per seat and total seats available.",
  },
] as const;

const GUIDE_TRIP_TYPE_OPTIONS = [
  {
    value: "private_trip",
    label: "Private Trip (One group at a time)",
    hint: "You take a single group out. Set a base price plus an extra-angler fee.",
  },
  {
    value: "small_group_trip",
    label: "Small Group Trip (Per-person)",
    hint: "Anglers book individual spots. Set a price per person and total spots available.",
  },
] as const;

export type TripTypeOption = {
  value: TripType;
  label: string;
  hint: string;
};

export function getTripTypeOptions(
  businessType: "charter" | "guide" | null | undefined,
): readonly TripTypeOption[] {
  return businessType === "guide" ? GUIDE_TRIP_TYPE_OPTIONS : CHARTER_TRIP_TYPE_OPTIONS;
}

// Back-compat export — charter pair.
export const CHARTER_TYPE_OPTIONS = CHARTER_TRIP_TYPE_OPTIONS;

export const tripInputSchema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(2, "Trip name is required").max(120),
    description: z.string().trim().min(10, "Add a short description").max(2000),
    start_time: timeStringSchema,
    duration_minutes: z.number().int().positive(),
    price_minor: z.number().int().min(0),
    per_extra_minor: z.number().int().min(0).default(0),
    min_party_size: z.number().int().min(1).max(50).default(1),
    max_party_size: z.number().int().min(1).max(50),
    currency: z.string().default("USD"),
    template_key: z.string().nullable().optional(),
    booking_type: z.enum(["instant_book", "request_to_book"]).default("request_to_book"),
    charter_type: z
      .enum(["private_charter", "shared_tour", "private_trip", "small_group_trip"])
      .default("private_charter"),
    seats_available: z.number().int().min(1).max(50).nullable().optional(),
    min_seats_to_sail: z.number().int().min(1).max(50).nullable().optional(),
    target_species: z.array(z.string()).min(1, "Pick at least one target fish").max(50),
    environments: z.array(z.string()).min(1, "Pick at least one environment").max(2, "Max 2 environments per trip"),
    techniques: z.array(z.string()).min(1, "Pick at least one fishing style").max(10),
    departure_address: z.string().trim().min(2, "Pick a departure point"),
    departure_lat: z.number().nullable().optional(),
    departure_lng: z.number().nullable().optional(),
    departure_place_id: z.string().nullable().optional(),
  })
  .refine((d) => d.min_party_size <= d.max_party_size, {
    message: "Min trip size must be less than or equal to max trip size",
    path: ["min_party_size"],
  })
  .refine(
    (d) => !isSharedTripType(d.charter_type) || (d.seats_available != null && d.seats_available >= 1),
    { message: "Enter total spots available for this shared trip", path: ["seats_available"] },
  )
  .refine(
    (d) =>
      !isSharedTripType(d.charter_type) ||
      d.min_seats_to_sail == null ||
      (d.seats_available != null && d.min_seats_to_sail <= d.seats_available),
    {
      message: "Minimum spots required can't exceed total spots available",
      path: ["min_seats_to_sail"],
    },
  );



export type TripInput = z.infer<typeof tripInputSchema>;

export const deleteTripSchema = z.object({ id: z.string().uuid() });
export type DeleteTripInput = z.infer<typeof deleteTripSchema>;

export const tripStatusSchema = z.enum(["draft", "active", "archived"]);
export type TripStatus = z.infer<typeof tripStatusSchema>;

export const setTripStatusSchema = z.object({
  id: z.string().uuid(),
  status: tripStatusSchema,
});
export type SetTripStatusInput = z.infer<typeof setTripStatusSchema>;

export const resolvePlaceSchema = z.object({ placeId: z.string().min(1) });
export type ResolvePlaceInput = z.infer<typeof resolvePlaceSchema>;
