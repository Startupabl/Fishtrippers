// Shared types, constants & Zod schemas used by both client and server functions.
import { z } from "zod";

// ---------- Business / category enums ----------

export const BUSINESS_TYPES = ["charter", "guide"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BOOKING_TYPES = ["instant", "inquiry"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export type AdvanceNoticeHours = 6 | 12 | 24 | 48;

export const CANCELLATION_POLICIES = ["flexible", "moderate", "strict"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const PRIMARY_CATEGORIES = [
  "inshore",
  "offshore",
  "freshwater",
  "fly_fishing",
  "spearfishing",
] as const;
export type PrimaryCategory = (typeof PRIMARY_CATEGORIES)[number];

export const PRIMARY_CATEGORY_DETAILS: Record<
  PrimaryCategory,
  { title: string; description: string }
> = {
  inshore: {
    title: "Inshore",
    description: "Bays, flats, mangroves, and coastal waters within 9 miles.",
  },
  offshore: {
    title: "Offshore / Deep Sea",
    description: "Blue-water trips targeting pelagics, wrecks and reefs.",
  },
  freshwater: {
    title: "Freshwater",
    description: "Lakes, rivers and reservoirs — bass, trout, walleye, pike.",
  },
  fly_fishing: {
    title: "Fly Fishing",
    description: "Salt or freshwater on the fly.",
  },
  spearfishing: {
    title: "Spearfishing",
    description: "Free-diving or scuba-assisted spearfishing trips.",
  },
};

// Curated catalog of species (id + label + which categories it commonly appears under).
export interface SpeciesItem {
  id: string;
  label: string;
  categories: PrimaryCategory[];
}

export const SPECIES_CATALOG: SpeciesItem[] = [
  // Inshore
  { id: "redfish", label: "Redfish", categories: ["inshore", "fly_fishing"] },
  { id: "snook", label: "Snook", categories: ["inshore", "fly_fishing"] },
  { id: "tarpon", label: "Tarpon", categories: ["inshore", "fly_fishing"] },
  { id: "speckled_trout", label: "Speckled Trout", categories: ["inshore"] },
  { id: "flounder", label: "Flounder", categories: ["inshore"] },
  { id: "permit", label: "Permit", categories: ["inshore", "fly_fishing"] },
  { id: "bonefish", label: "Bonefish", categories: ["inshore", "fly_fishing"] },
  // Offshore
  { id: "mahi", label: "Mahi-Mahi", categories: ["offshore"] },
  { id: "tuna", label: "Tuna", categories: ["offshore"] },
  { id: "marlin", label: "Marlin", categories: ["offshore"] },
  { id: "sailfish", label: "Sailfish", categories: ["offshore"] },
  { id: "wahoo", label: "Wahoo", categories: ["offshore"] },
  { id: "grouper", label: "Grouper", categories: ["offshore"] },
  { id: "snapper", label: "Snapper", categories: ["offshore"] },
  { id: "kingfish", label: "Kingfish", categories: ["offshore"] },
  { id: "amberjack", label: "Amberjack", categories: ["offshore"] },
  { id: "swordfish", label: "Swordfish", categories: ["offshore"] },
  // Freshwater
  { id: "largemouth_bass", label: "Largemouth Bass", categories: ["freshwater"] },
  { id: "smallmouth_bass", label: "Smallmouth Bass", categories: ["freshwater"] },
  { id: "trout", label: "Trout", categories: ["freshwater", "fly_fishing"] },
  { id: "walleye", label: "Walleye", categories: ["freshwater"] },
  { id: "pike", label: "Northern Pike", categories: ["freshwater"] },
  { id: "musky", label: "Musky", categories: ["freshwater"] },
  { id: "catfish", label: "Catfish", categories: ["freshwater"] },
  { id: "salmon", label: "Salmon", categories: ["freshwater", "fly_fishing"] },
  { id: "panfish", label: "Panfish", categories: ["freshwater"] },
  // Spearfishing common targets
  { id: "hogfish", label: "Hogfish", categories: ["spearfishing", "offshore"] },
  { id: "lionfish", label: "Lionfish", categories: ["spearfishing"] },
  { id: "lobster", label: "Lobster", categories: ["spearfishing"] },
];

export function speciesForCategory(c: PrimaryCategory | null): SpeciesItem[] {
  if (!c) return [];
  return SPECIES_CATALOG.filter((s) => s.categories.includes(c));
}

export function speciesLabel(id: string): string {
  return SPECIES_CATALOG.find((s) => s.id === id)?.label ?? id;
}

// ---------- Boat feature catalog (with optional per-item comments) ----------

export interface FeatureItem {
  id: string;
  label: string;
}
export interface FeatureGroup {
  id: string;
  label: string;
  helper?: string;
  items: FeatureItem[];
}

export const BOAT_FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "navigation",
    label: "Navigation",
    helper: "Tell us about your boat's navigation gear.",
    items: [
      { id: "gps", label: "GPS" },
      { id: "fishfinder", label: "Fishfinder" },
      { id: "vhf_radio", label: "VHF Radio" },
      { id: "radar", label: "Radar" },
    ],
  },
  {
    id: "facilities",
    label: "Facilities",
    helper: "Which of these facilities are available?",
    items: [
      { id: "flybridge", label: "Flybridge" },
      { id: "toilet", label: "Toilet" },
      { id: "shower", label: "Shower" },
      { id: "kitchen", label: "Kitchen" },
      { id: "bed", label: "Bed" },
      { id: "wheelchair_accessible", label: "Wheelchair Accessible" },
    ],
  },
  {
    id: "features",
    label: "Features",
    helper: "Tell us about any additional features.",
    items: [
      { id: "air_conditioning", label: "Air Conditioning" },
      { id: "multimedia_system", label: "Multimedia System" },
      { id: "tv", label: "TV" },
      { id: "wireless_trolling_motor", label: "Wireless Trolling Motor" },
      { id: "refrigerator", label: "Refrigerator" },
      { id: "ice_box", label: "Ice-Box" },
    ],
  },
  {
    id: "gear_and_crew",
    label: "Gear & Crew",
    helper: "What fishing gear do you use?",
    items: [
      { id: "fighting_chair", label: "Fighting Chair" },
      { id: "first_mate", label: "First Mate" },
      { id: "livewell", label: "Livewell/Live Bait Tank" },
      { id: "spearfishing_equipment", label: "Spearfishing Equipment" },
      { id: "snorkeling_equipment", label: "Snorkeling Equipment" },
      { id: "outriggers", label: "Outriggers" },
      { id: "downriggers", label: "Downriggers" },
      { id: "tuna_tubes", label: "Tuna Tubes" },
    ],
  },
];

export const ALL_FEATURE_IDS: string[] = BOAT_FEATURE_GROUPS.flatMap((g) =>
  g.items.map((i) => i.id),
);

export function featureLabel(id: string): string {
  for (const g of BOAT_FEATURE_GROUPS) {
    const m = g.items.find((i) => i.id === id);
    if (m) return m.label;
  }
  return id;
}

// ---------- Zod schemas ----------

export const operatorDraftSchema = z.object({
  business_type: z.enum(BUSINESS_TYPES).nullable().optional(),
  display_name: z.string().trim().max(120).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  about: z.string().trim().max(1000).optional().nullable(),
  booking_type: z.enum(BOOKING_TYPES).nullable().optional(),
  advance_notice_hours: z
    .union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)])
    .nullable()
    .optional(),
  cancellation_policy: z.enum(CANCELLATION_POLICIES).nullable().optional(),
  primary_category: z.enum(PRIMARY_CATEGORIES).nullable().optional(),
  target_species: z.array(z.string()).optional().nullable(),
});

// features: { [featureId]: comment } — comment may be ""
const featuresMapSchema = z.record(z.string(), z.string().max(50));

// Accept either the legacy array form or the new record form for features.
const featuresInputSchema = z
  .union([z.array(z.string()), featuresMapSchema])
  .transform((v) =>
    Array.isArray(v)
      ? Object.fromEntries(v.map((id) => [id, ""]))
      : v,
  )
  .default({} as Record<string, string>);

export const vesselDraftSchema = z.object({
  boat_type_id: z.string().trim().min(1).max(64).optional().nullable(),
  manufacturer: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  length_ft: z.number().positive().max(500).optional().nullable(),
  restored: z.boolean().optional().nullable(),
  num_engines: z.number().int().min(0).max(20).optional().nullable(),
  horsepower_per_engine: z.number().int().min(0).max(10000).optional().nullable(),
  max_cruising_speed_knots: z.number().min(0).max(200).optional().nullable(),
  max_passenger_capacity: z.number().int().min(1).max(200).optional().nullable(),
  features: featuresInputSchema,
  // kept for backwards compat but no longer surfaced in UI
  engine_type: z.string().trim().max(120).optional().nullable(),
  engine_size: z.string().trim().max(120).optional().nullable(),
});

export const upsertDraftInputSchema = z.object({
  operator: operatorDraftSchema,
  vessel: vesselDraftSchema.optional().nullable(),
});

export type OperatorDraft = z.infer<typeof operatorDraftSchema>;
export type VesselDraft = z.infer<typeof vesselDraftSchema>;
export type UpsertDraftInput = z.infer<typeof upsertDraftInputSchema>;

// Submit requires every field to be present and valid.
export const submitOperatorSchema = z.object({
  business_type: z.enum(BUSINESS_TYPES),
  display_name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(200),
  about: z.string().trim().min(150).max(1000),
  booking_type: z.enum(BOOKING_TYPES),
  advance_notice_hours: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)]),
  cancellation_policy: z.enum(CANCELLATION_POLICIES),
  primary_category: z.enum(PRIMARY_CATEGORIES),
  target_species: z.array(z.string()).min(1).max(50),
  vessel: z
    .object({
      boat_type_id: z.string().trim().min(1).max(64),
      manufacturer: z.string().trim().max(120).optional().nullable(),
      year: z.number().int().min(1900).max(2100).optional().nullable(),
      length_ft: z.number().positive().max(500).optional().nullable(),
      restored: z.boolean().default(false),
      num_engines: z.number().int().min(0).max(20).optional().nullable(),
      horsepower_per_engine: z.number().int().min(0).max(10000).optional().nullable(),
      max_cruising_speed_knots: z.number().min(0).max(200).optional().nullable(),
      max_passenger_capacity: z.number().int().min(1).max(200),
      features: featuresMapSchema.default({}),
    })
    .optional()
    .nullable(),
});

export type SubmitOperatorInput = z.infer<typeof submitOperatorSchema>;

// Policy descriptions (single source of truth for UI cards).
export const CANCELLATION_POLICY_DETAILS: Record<
  CancellationPolicy,
  { title: string; summary: string; terms: string[] }
> = {
  flexible: {
    title: "Flexible",
    summary: "Best for trying new customers",
    terms: [
      "Free cancellation up to 24 hours before departure.",
      "Inside 24 hours: captain keeps 50% of the trip price.",
    ],
  },
  moderate: {
    title: "Moderate",
    summary: "Balanced protection",
    terms: [
      "Free cancellation up to 7 days before departure.",
      "Between 7 days and 24 hours: 50% refund.",
      "Inside 24 hours: non-refundable.",
    ],
  },
  strict: {
    title: "Strict",
    summary: "Best for high-demand seasons",
    terms: [
      "Free cancellation up to 14 days before departure.",
      "Within 14 days: non-refundable.",
    ],
  },
};

export const WEATHER_POLICY_DISCLAIMER =
  "Regardless of the chosen cancellation policy, if the Captain cancels the trip due to unsafe weather or sea conditions, the customer always receives a 100% refund.";
