// Shared schemas + template catalog for the operator Trip Catalog step.
import { z } from "zod";
import type { PrimaryCategory } from "./operators.shared";

export const DURATION_OPTIONS = [
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
  { value: 480, label: "8 hours" },
  { value: 600, label: "10 hours" },
  { value: 720, label: "12 hours" },
  { value: 960, label: "Overnight (16h)" },
] as const;

export interface TripTemplate {
  key: string;
  title: string;
  defaultDurationMinutes: number;
  blurb: string;
}

export const TRIP_TEMPLATES: Record<PrimaryCategory, TripTemplate[]> = {
  offshore: [
    {
      key: "offshore_half_day",
      title: "Half-Day Deep Sea",
      defaultDurationMinutes: 240,
      blurb: "4-hour offshore run targeting pelagics close to the shelf.",
    },
    {
      key: "offshore_full_day",
      title: "Full-Day Big Game",
      defaultDurationMinutes: 480,
      blurb: "Full day chasing tuna, marlin and other trophy species.",
    },
    {
      key: "offshore_overnight_sword",
      title: "Overnight Swordfish Trip",
      defaultDurationMinutes: 960,
      blurb: "Overnight deep-drop trip targeting swordfish.",
    },
  ],
  inshore: [
    {
      key: "inshore_flats_4h",
      title: "4-Hour Flats Trip",
      defaultDurationMinutes: 240,
      blurb: "Half-day flats fishing for redfish, trout and snook.",
    },
    {
      key: "inshore_bay_6h",
      title: "6-Hour Bay Exploration",
      defaultDurationMinutes: 360,
      blurb: "Extended inshore run exploring bays and back-country.",
    },
    {
      key: "inshore_sight_cast",
      title: "Sight Casting Specialist",
      defaultDurationMinutes: 360,
      blurb: "Poling the flats for tailing fish — light tackle, eyes-on.",
    },
  ],
  freshwater: [
    {
      key: "fresh_morning_bass",
      title: "Morning Bass Run",
      defaultDurationMinutes: 240,
      blurb: "Early-morning bass session on prime lake structure.",
    },
    {
      key: "fresh_full_day_lake",
      title: "Full-Day Lake Tournament",
      defaultDurationMinutes: 480,
      blurb: "Tournament-style full day on the lake.",
    },
    {
      key: "fresh_river_float",
      title: "River Float Trip",
      defaultDurationMinutes: 360,
      blurb: "Drift-boat or raft float, working seams and pools.",
    },
  ],
  fly: [
    {
      key: "fly_fundamentals",
      title: "Fly Fishing Fundamentals",
      defaultDurationMinutes: 240,
      blurb: "Beginner-friendly intro to fly fishing — casting + reading water.",
    },
    {
      key: "fly_salt_sight",
      title: "Saltwater Fly Sight-Casting",
      defaultDurationMinutes: 480,
      blurb: "Bonefish, permit, tarpon — sight-casting on the flats.",
    },
    {
      key: "fly_trout_stream",
      title: "Trout Stream Expedition",
      defaultDurationMinutes: 480,
      blurb: "Walk-and-wade trout fishing on a classic stream.",
    },
  ],
};

export const tripInputSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(2, "Trip name is required").max(120),
  description: z.string().trim().min(10, "Add a short description").max(2000),
  duration_minutes: z.number().int().positive(),
  price_minor: z.number().int().min(0),
  currency: z.string().default("USD"),
  template_key: z.string().nullable().optional(),
  departure_address: z.string().trim().min(2, "Pick a departure point"),
  departure_lat: z.number().nullable().optional(),
  departure_lng: z.number().nullable().optional(),
  departure_place_id: z.string().nullable().optional(),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const deleteTripSchema = z.object({ id: z.string().uuid() });
export type DeleteTripInput = z.infer<typeof deleteTripSchema>;

export const resolvePlaceSchema = z.object({ placeId: z.string().min(1) });
export type ResolvePlaceInput = z.infer<typeof resolvePlaceSchema>;
