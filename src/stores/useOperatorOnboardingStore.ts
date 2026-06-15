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
  | "booking_rules"
  | "review";

export interface VesselDraftState {
  manufacturer: string;
  model: string;
  year: string; // string while typing
  length_ft: string;
  engine_type: string;
  engine_size: string;
  max_passenger_capacity: string;
  features: string[];
}

export interface OperatorOnboardingState {
  // step navigation
  currentStep: StepId;
  setStep: (s: StepId) => void;

  // form data
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

  // post-submit
  submitted: boolean;

  // setters
  setBusinessType: (t: BusinessType) => void;
  setProfile: (p: { display_name?: string; location?: string; about?: string }) => void;
  setVessel: (v: Partial<VesselDraftState>) => void;
  toggleFeature: (id: string) => void;
  setBookingRules: (r: {
    booking_type?: BookingType;
    advance_notice_hours?: AdvanceNoticeHours;
    cancellation_policy?: CancellationPolicy;
  }) => void;
  setPrimaryCategory: (c: PrimaryCategory) => void;
  toggleSpecies: (id: string) => void;
  setSubmitted: (v: boolean) => void;
  reset: () => void;
  hydrateFromServer: (input: {
    operator: any | null;
    vessel: any | null;
  }) => void;
}

const emptyVessel = (): VesselDraftState => ({
  manufacturer: "",
  model: "",
  year: "",
  length_ft: "",
  engine_type: "",
  engine_size: "",
  max_passenger_capacity: "",
  features: [],
});

export const useOperatorOnboardingStore = create<OperatorOnboardingState>()(
  persist(
    (set, get) => ({
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
          const has = s.vessel.features.includes(id);
          return {
            vessel: {
              ...s.vessel,
              features: has
                ? s.vessel.features.filter((f) => f !== id)
                : [...s.vessel.features, id],
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
          submitted: false,
        }),
      hydrateFromServer: ({ operator, vessel }) => {
        if (!operator) return;
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
          vessel: vessel
            ? {
                manufacturer: vessel.manufacturer ?? "",
                model: vessel.model ?? "",
                year: vessel.year != null ? String(vessel.year) : "",
                length_ft: vessel.length_ft != null ? String(vessel.length_ft) : "",
                engine_type: vessel.engine_type ?? "",
                engine_size: vessel.engine_size ?? "",
                max_passenger_capacity:
                  vessel.max_passenger_capacity != null
                    ? String(vessel.max_passenger_capacity)
                    : "",
                features: Array.isArray(vessel.features) ? vessel.features : [],
              }
            : emptyVessel(),
        });
      },
    }),
    {
      name: "operator-onboarding-draft-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ----- Validity helpers -----
export function isProfileValid(s: OperatorOnboardingState): boolean {
  const aboutLen = s.about.trim().length;
  return (
    s.display_name.trim().length >= 2 &&
    s.location.trim().length >= 2 &&
    aboutLen >= 150 &&
    aboutLen <= 1000
  );
}

export function isBoatDetailsValid(s: OperatorOnboardingState): boolean {
  if (s.business_type === "guide") return true;
  if (s.business_type !== "charter") return false;
  const v = s.vessel;
  const year = Number(v.year);
  const len = Number(v.length_ft);
  const cap = Number(v.max_passenger_capacity);
  return (
    v.manufacturer.trim().length > 0 &&
    v.model.trim().length > 0 &&
    Number.isFinite(year) && year >= 1900 && year <= 2100 &&
    Number.isFinite(len) && len > 0 &&
    v.engine_type.trim().length > 0 &&
    v.engine_size.trim().length > 0 &&
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
