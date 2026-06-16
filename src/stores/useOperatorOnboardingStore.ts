// Persisted draft for the operator/captain onboarding flow.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BusinessType,
  BookingType,
  AdvanceNoticeHours,
  CancellationPolicy,
  PrimaryCategory,
} from "@/lib/operators.shared";

export type StepId =
  | "business_type"
  | "profile"
  | "boat_details"
  | "fishing_focus"
  | "trip_catalog"
  | "booking_rules";

export interface VesselDraftState {
  boat_type_id: string;
  manufacturer: string;
  length_ft: string;
  year: string;
  restored: boolean;
  engine_manufacturer: string;
  num_engines: string;
  horsepower_per_engine: string;
  max_cruising_speed_knots: string;
  max_passenger_capacity: string;
  /** featureId -> optional 50-char comment (empty string allowed) */
  features: Record<string, string>;
}

export interface DefaultDeparture {
  address: string;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface OperatorOnboardingState {
  currentStep: StepId;
  setStep: (s: StepId) => void;

  business_type: BusinessType | null;
  display_name: string;
  location: string;
  about: string;
  booking_type: BookingType | null;
  advance_notice_hours: AdvanceNoticeHours | null;
  cancellation_policy: CancellationPolicy | null;
  primary_category: PrimaryCategory | null;
  target_species: string[];
  vessel: VesselDraftState;
  default_departure: DefaultDeparture;

  submitted: boolean;

  setBusinessType: (t: BusinessType) => void;
  setProfile: (p: { display_name?: string; location?: string; about?: string }) => void;
  setVessel: (v: Partial<VesselDraftState>) => void;
  toggleFeature: (id: string) => void;
  setFeatureComment: (id: string, comment: string) => void;
  setBookingRules: (r: {
    booking_type?: BookingType;
    advance_notice_hours?: AdvanceNoticeHours;
    cancellation_policy?: CancellationPolicy;
  }) => void;
  setPrimaryCategory: (c: PrimaryCategory) => void;
  toggleSpecies: (id: string) => void;
  setDefaultDeparture: (d: DefaultDeparture) => void;
  setSubmitted: (v: boolean) => void;
  reset: () => void;
  hydrateFromServer: (input: { operator: any | null; vessel: any | null }) => void;
}

const emptyVessel = (): VesselDraftState => ({
  boat_type_id: "",
  manufacturer: "",
  length_ft: "",
  year: "",
  restored: false,
  engine_manufacturer: "",
  num_engines: "",
  horsepower_per_engine: "",
  max_cruising_speed_knots: "",
  max_passenger_capacity: "",
  features: {},
});

export const useOperatorOnboardingStore = create<OperatorOnboardingState>()(
  persist(
    (set) => ({
      currentStep: "business_type",
      setStep: (s) => set({ currentStep: s }),

      business_type: null,
      display_name: "",
      location: "",
      about: "",
      booking_type: null,
      advance_notice_hours: null,
      cancellation_policy: null,
      primary_category: null,
      target_species: [],
      vessel: emptyVessel(),
      default_departure: { address: "", lat: null, lng: null, place_id: null, city: null, state: null, country: null },
      submitted: false,

      setBusinessType: (t) => set({ business_type: t }),
      setProfile: (p) =>
        set((s) => ({
          display_name: p.display_name ?? s.display_name,
          location: p.location ?? s.location,
          about: p.about ?? s.about,
        })),
      setVessel: (v) => set((s) => ({ vessel: { ...s.vessel, ...v } })),
      toggleFeature: (id) =>
        set((s) => {
          const next = { ...s.vessel.features };
          if (id in next) delete next[id];
          else next[id] = "";
          return { vessel: { ...s.vessel, features: next } };
        }),
      setFeatureComment: (id, comment) =>
        set((s) => {
          if (!(id in s.vessel.features)) return {} as any;
          return {
            vessel: {
              ...s.vessel,
              features: { ...s.vessel.features, [id]: comment.slice(0, 50) },
            },
          };
        }),
      setBookingRules: (r) =>
        set((s) => ({
          booking_type: r.booking_type ?? s.booking_type,
          advance_notice_hours: r.advance_notice_hours ?? s.advance_notice_hours,
          cancellation_policy: r.cancellation_policy ?? s.cancellation_policy,
        })),
      setPrimaryCategory: (c) => set({ primary_category: c }),
      toggleSpecies: (id) =>
        set((s) => {
          const has = s.target_species.includes(id);
          return {
            target_species: has
              ? s.target_species.filter((x) => x !== id)
              : [...s.target_species, id],
          };
        }),
      setDefaultDeparture: (d) => set({ default_departure: d }),
      setSubmitted: (v) => set({ submitted: v }),
      reset: () =>
        set({
          currentStep: "business_type",
          business_type: null,
          display_name: "",
          location: "",
          about: "",
          booking_type: null,
          advance_notice_hours: null,
          cancellation_policy: null,
          primary_category: null,
          target_species: [],
          vessel: emptyVessel(),
          default_departure: { address: "", lat: null, lng: null, place_id: null, city: null, state: null, country: null },
          submitted: false,
        }),
      hydrateFromServer: ({ operator, vessel }) => {
        if (!operator) return;
        const rawFeatures = vessel?.features;
        let featuresMap: Record<string, string> = {};
        if (Array.isArray(rawFeatures)) {
          for (const id of rawFeatures) featuresMap[String(id)] = "";
        } else if (rawFeatures && typeof rawFeatures === "object") {
          for (const [k, v] of Object.entries(rawFeatures)) {
            featuresMap[k] = typeof v === "string" ? v : "";
          }
        }
        // Migrate any persisted "review" step from older sessions.
        const cur = (useOperatorOnboardingStore.getState() as any).currentStep;
        if (cur === "review") set({ currentStep: "booking_rules" } as any);
        set({
          business_type: operator.business_type ?? null,
          display_name: operator.display_name ?? "",
          location: operator.location ?? "",
          about: operator.about ?? "",
          booking_type: operator.booking_type ?? null,
          advance_notice_hours: operator.advance_notice_hours ?? null,
          cancellation_policy: operator.cancellation_policy ?? null,
          primary_category: operator.primary_category ?? null,
          target_species: Array.isArray(operator.target_species)
            ? operator.target_species
            : [],
          submitted: !!operator.submitted_at,
          default_departure: {
            address: operator.default_departure_address ?? "",
            lat: operator.default_departure_lat ?? null,
            lng: operator.default_departure_lng ?? null,
            place_id: operator.default_departure_place_id ?? null,
            city: operator.default_departure_city ?? null,
            state: operator.default_departure_state ?? null,
            country: operator.default_departure_country ?? null,
          },
          vessel: vessel
            ? {
                boat_type_id: vessel.boat_type_id ?? "",
                manufacturer: vessel.manufacturer ?? "",
                length_ft: vessel.length_ft != null ? String(vessel.length_ft) : "",
                year: vessel.year != null ? String(vessel.year) : "",
                restored: !!vessel.restored,
                engine_manufacturer: vessel.engine_type ?? "",
                num_engines: vessel.num_engines != null ? String(vessel.num_engines) : "",
                horsepower_per_engine:
                  vessel.horsepower_per_engine != null
                    ? String(vessel.horsepower_per_engine)
                    : "",
                max_cruising_speed_knots:
                  vessel.max_cruising_speed_knots != null
                    ? String(vessel.max_cruising_speed_knots)
                    : "",
                max_passenger_capacity:
                  vessel.max_passenger_capacity != null
                    ? String(vessel.max_passenger_capacity)
                    : "",
                features: featuresMap,
              }
            : emptyVessel(),
        });
      },
    }),
    {
      name: "operator-onboarding-draft-v2",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ----- Validity helpers -----
export function isProfileValid(s: OperatorOnboardingState): boolean {
  const aboutLen = s.about.trim().length;
  return (
    s.display_name.trim().length >= 2 &&
    s.default_departure.address.trim().length >= 2 &&
    aboutLen >= 150 &&
    aboutLen <= 1000
  );
}

export function isBoatDetailsValid(s: OperatorOnboardingState): boolean {
  if (s.business_type === "guide") return true;
  if (s.business_type !== "charter") return false;
  const v = s.vessel;
  const cap = Number(v.max_passenger_capacity);
  return (
    v.boat_type_id.trim().length > 0 &&
    Number.isInteger(cap) && cap >= 1 && cap <= 200
  );
}

export function isFishingFocusValid(s: OperatorOnboardingState): boolean {
  return !!s.primary_category && s.target_species.length >= 1;
}

export function isBookingRulesValid(s: OperatorOnboardingState): boolean {
  return !!s.booking_type && !!s.advance_notice_hours && !!s.cancellation_policy;
}

export function isReadyToSubmit(s: OperatorOnboardingState): boolean {
  return (
    !!s.business_type &&
    isProfileValid(s) &&
    isBoatDetailsValid(s) &&
    isFishingFocusValid(s) &&
    isBookingRulesValid(s)
  );
}
