// Shared schemas and constants for the operator onboarding flow.
// Imported by both client UI and server functions.

import { z } from "zod";

export const BUSINESS_TYPES = ["charter", "guide"] as const;
export const BOOKING_TYPES = ["instant", "inquiry"] as const;
export const ADVANCE_NOTICE_OPTIONS = [6, 12, 24, 48] as const;
export const CANCELLATION_POLICIES = ["flexible", "moderate", "strict"] as const;
export const PRIMARY_CATEGORIES = ["offshore", "inshore", "freshwater", "fly"] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type BookingType = (typeof BOOKING_TYPES)[number];
export type AdvanceNoticeHours = (typeof ADVANCE_NOTICE_OPTIONS)[number];
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];
export type PrimaryCategory = (typeof PRIMARY_CATEGORIES)[number];

export const PRIMARY_CATEGORY_DETAILS: Record<
  PrimaryCategory,
  { title: string; description: string }
> = {
  offshore: {
    title: "Offshore",
    description: "Big water, big game — tuna, marlin, mahi, deep sea trolling.",
  },
  inshore: {
    title: "Inshore",
    description: "Bays, flats and estuaries — redfish, snook, tarpon, trout.",
  },
  freshwater: {
    title: "Freshwater",
    description: "Lakes and rivers — bass, trout, walleye, pike, salmon.",
  },
  fly: {
    title: "Fly Fishing",
    description: "Fly rod specialist — trout streams, bonefish flats, permit.",
  },
};

export interface SpeciesItem {
  id: string;
  label: string;
}
export interface SpeciesGroup {
  category: PrimaryCategory;
  label: string;
  items: SpeciesItem[];
}

export const SPECIES_CATALOG: SpeciesGroup[] = [
  {
    category: "offshore",
    label: "Offshore",
    items: [
      { id: "tuna", label: "Tuna" },
      { id: "marlin", label: "Marlin" },
      { id: "mahi", label: "Mahi-Mahi" },
      { id: "wahoo", label: "Wahoo" },
      { id: "sailfish", label: "Sailfish" },
      { id: "snapper", label: "Snapper" },
      { id: "grouper", label: "Grouper" },
      { id: "kingfish", label: "Kingfish" },
    ],
  },
  {
    category: "inshore",
    label: "Inshore",
    items: [
      { id: "redfish", label: "Redfish" },
      { id: "snook", label: "Snook" },
      { id: "tarpon", label: "Tarpon" },
      { id: "sea_trout", label: "Sea Trout" },
      { id: "flounder", label: "Flounder" },
    ],
  },
  {
    category: "freshwater",
    label: "Freshwater",
    items: [
      { id: "largemouth_bass", label: "Largemouth Bass" },
      { id: "smallmouth_bass", label: "Smallmouth Bass" },
      { id: "rainbow_trout", label: "Rainbow Trout" },
      { id: "walleye", label: "Walleye" },
      { id: "northern_pike", label: "Northern Pike" },
      { id: "musky", label: "Musky" },
      { id: "catfish", label: "Catfish" },
      { id: "crappie", label: "Crappie" },
      { id: "salmon", label: "Salmon" },
    ],
  },
  {
    category: "fly",
    label: "Fly",
    items: [
      { id: "trout_fly", label: "Trout (Fly)" },
      { id: "bonefish", label: "Bonefish" },
      { id: "permit", label: "Permit" },
      { id: "tarpon_fly", label: "Tarpon (Fly)" },
    ],
  },
];

export const ALL_SPECIES_IDS: string[] = SPECIES_CATALOG.flatMap((g) =>
  g.items.map((i) => i.id),
);

export function speciesLabel(id: string): string {
  for (const g of SPECIES_CATALOG) {
    const m = g.items.find((i) => i.id === id);
    if (m) return m.label;
  }
  return id;
}

// Feature catalog used by the boat features checklist.
export interface FeatureItem {
  id: string;
  label: string;
}
export interface FeatureGroup {
  id: string;
  label: string;
  items: FeatureItem[];
}

export const BOAT_FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "navigation",
    label: "Navigation & Electronics",
    items: [
      { id: "gps", label: "GPS" },
      { id: "fish_finder", label: "Fish Finder" },
      { id: "radar", label: "Radar" },
      { id: "vhf_radio", label: "VHF Radio" },
    ],
  },
  {
    id: "amenities",
    label: "Amenities",
    items: [
      { id: "toilet", label: "Toilet / Restroom" },
      { id: "ac", label: "Air Conditioning" },
      { id: "canopy", label: "Canopy / Shade" },
      { id: "cooler", label: "Cooler / Ice Box" },
      { id: "stereo", label: "Stereo / Bluetooth" },
    ],
  },
  {
    id: "fishing_gear",
    label: "Fishing Gear",
    items: [
      { id: "rods_reels", label: "Rods & Reels Provided" },
      { id: "live_bait_well", label: "Live Bait Well" },
      { id: "tackle", label: "Tackle Provided" },
      { id: "downriggers", label: "Downriggers" },
    ],
  },
];

export const ALL_FEATURE_IDS: string[] = BOAT_FEATURE_GROUPS.flatMap((g) =>
  g.items.map((i) => i.id),
);

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

export const vesselDraftSchema = z.object({
  manufacturer: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  length_ft: z.number().positive().max(500).optional().nullable(),
  engine_type: z.string().trim().max(120).optional().nullable(),
  engine_size: z.string().trim().max(120).optional().nullable(),
  max_passenger_capacity: z.number().int().min(1).max(200).optional().nullable(),
  features: z.array(z.string()).default([]),
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
  booking_type: z.enum(BOOKING_TYPES),
  advance_notice_hours: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)]),
  cancellation_policy: z.enum(CANCELLATION_POLICIES),
  primary_category: z.enum(PRIMARY_CATEGORIES),
  target_species: z.array(z.string()).min(1).max(50),
  vessel: z
    .object({
      manufacturer: z.string().trim().min(1).max(120),
      model: z.string().trim().min(1).max(120),
      year: z.number().int().min(1900).max(2100),
      length_ft: z.number().positive().max(500),
      engine_type: z.string().trim().min(1).max(120),
      engine_size: z.string().trim().min(1).max(120),
      max_passenger_capacity: z.number().int().min(1).max(200),
      features: z.array(z.string()).default([]),
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
