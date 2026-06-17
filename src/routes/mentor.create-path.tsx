import { useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthStore } from "@/stores/useAuthStore";
import { useHasActiveListingStatus } from "@/hooks/useHasActiveListing";
import {
  useOperatorOnboardingStore,
  isProfileValid,
  isBoatDetailsValid,
  isFishingFocusValid,
  isBookingRulesValid,
  type StepId,
} from "@/stores/useOperatorOnboardingStore";
import { getMyOperator } from "@/lib/operators.functions";
import { listMyTrips } from "@/lib/trips.functions";
import {
  OnboardingSidebar,
  type SidebarStep,
} from "@/components/operator-onboarding/OnboardingSidebar";
import { BusinessTypeStep } from "@/components/operator-onboarding/steps/BusinessTypeStep";
import { ProfileStep } from "@/components/operator-onboarding/steps/ProfileStep";
import { BoatDetailsStep } from "@/components/operator-onboarding/steps/BoatDetailsStep";
import { FishingFocusStep } from "@/components/operator-onboarding/steps/FishingFocusStep";
import { BookingRulesStep } from "@/components/operator-onboarding/steps/BookingRulesStep";
import { TripCatalogStep } from "@/components/operator-onboarding/steps/TripCatalogStep";

import { Logo } from "@/components/brand/Logo";
import { upsertOperatorDraft } from "@/lib/operators.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/mentor/create-path")({
  validateSearch: (search) =>
    z
      .object({
        new: z.boolean().optional(),
      })
      .parse(search),
  component: CreatePathPage,
});

const STEP_ORDER: StepId[] = [
  "business_type",
  "profile",
  "boat_details",
  "fishing_focus",
  "trip_catalog",
  "booking_rules",
];

function CreatePathPage() {
  const navigate = useNavigate();
  const initialized = useAuthStore((s) => s.initialized);
  const authUser = useAuthStore((s) => s.user);

  const state = useOperatorOnboardingStore();
  const fetchMine = useServerFn(getMyOperator);

  const { hasListing, isLoaded: listingLoaded } = useHasActiveListingStatus();

  // Redirect to /login if not authenticated.
  useEffect(() => {
    if (initialized && !authUser) {
      navigate({ to: "/login", search: { redirect: "/mentor/create-path" } as any });
    }
  }, [initialized, authUser, navigate]);

  // If the user already has a listing, send them to the dashboard hub —
  // the creation form is a one-time onboarding surface.
  useEffect(() => {
    if (initialized && authUser && listingLoaded && hasListing) {
      navigate({ to: "/dashboard/my-listing" });
    }
  }, [initialized, authUser, listingLoaded, hasListing, navigate]);

  // Hydrate from server once.
  const { data: server } = useQuery({
    queryKey: ["my-operator", authUser?.id],
    queryFn: () => fetchMine(),
    enabled: !!authUser,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (server) {
      useOperatorOnboardingStore.getState().hydrateFromServer(server);
    }
  }, [server]);

  const fetchTrips = useServerFn(listMyTrips);
  const { data: tripsData } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => fetchTrips(),
    enabled: !!authUser,
  });
  const tripCount = tripsData?.trips?.length ?? 0;

  // ---- Step status computation ----
  const steps: SidebarStep[] = useMemo(() => {
    const profileOk = isProfileValid(state);
    const boatOk = isBoatDetailsValid(state);
    const focusOk = isFishingFocusValid(state);
    const rulesOk = isBookingRulesValid(state);
    const isGuide = state.business_type === "guide";

    const status = (id: StepId): SidebarStep["status"] => {
      if (state.currentStep === id) return "active";
      if (id === "business_type") return state.business_type ? "complete" : "upcoming";
      if (id === "profile") return profileOk ? "complete" : "upcoming";
      if (id === "boat_details") {
        if (isGuide) return "skipped";
        return boatOk ? "complete" : "upcoming";
      }
      if (id === "fishing_focus") return focusOk ? "complete" : "upcoming";
      if (id === "trip_catalog") return tripCount > 0 ? "complete" : "upcoming";
      if (id === "booking_rules") return rulesOk ? "complete" : "upcoming";
      return "upcoming";
    };

    return [
      { id: "business_type", label: "Business type", status: status("business_type") },
      { id: "profile", label: "Profile", status: status("profile") },
      { id: "boat_details", label: "Boat details", status: status("boat_details") },
      { id: "fishing_focus", label: "Fishing focus", status: status("fishing_focus") },
      { id: "trip_catalog", label: "Trip catalog", status: status("trip_catalog") },
      { id: "booking_rules", label: "Booking rules", status: status("booking_rules") },
    ];
  }, [state, tripCount]);

  const goTo = (id: StepId) => state.setStep(id);
  const saveDraft = useServerFn(upsertOperatorDraft);

  const persistCurrentStep = async (): Promise<boolean> => {
    try {
      await saveDraft({
        data: {
          operator: {
            business_type: state.business_type ?? null,
            display_name: state.display_name || null,
            location: state.location || null,
            about: state.about || null,
            booking_type: state.booking_type ?? null,
            advance_notice_hours: state.advance_notice_hours ?? null,
            cancellation_policy: state.cancellation_policy ?? null,
            primary_category: state.primary_category ?? null,
            target_species: state.target_species ?? [],
          },
          vessel:
            state.business_type === "charter"
              ? {
                  boat_type_id: state.vessel.boat_type_id || null,
                  manufacturer: state.vessel.manufacturer || null,
                  year: state.vessel.year ? Number(state.vessel.year) : null,
                  length_ft: state.vessel.length_ft
                    ? Number(state.vessel.length_ft)
                    : null,
                  restored: state.vessel.restored,
                  num_engines: state.vessel.num_engines
                    ? Number(state.vessel.num_engines)
                    : null,
                  horsepower_per_engine: state.vessel.horsepower_per_engine
                    ? Number(state.vessel.horsepower_per_engine)
                    : null,
                  max_cruising_speed_knots: state.vessel.max_cruising_speed_knots
                    ? Number(state.vessel.max_cruising_speed_knots)
                    : null,
                  engine_type: state.vessel.engine_manufacturer || null,
                  max_passenger_capacity: state.vessel.max_passenger_capacity
                    ? Number(state.vessel.max_passenger_capacity)
                    : null,
                  features: state.vessel.features ?? {},
                }
              : null,
        },
      } as any);
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save progress");
      return false;
    }
  };

  const scrollFormToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const advance = async () => {
    const idx = STEP_ORDER.indexOf(state.currentStep);
    let nextIdx = idx + 1;
    if (
      state.business_type === "guide" &&
      STEP_ORDER[nextIdx] === "boat_details"
    ) {
      nextIdx += 1;
    }
    // Persist operator-shaped steps before moving forward. Trip catalog
    // persists per-trip inside its own modal so we just navigate.
    if (state.currentStep !== "trip_catalog") {
      const ok = await persistCurrentStep();
      if (!ok) return;
    }
    if (nextIdx < STEP_ORDER.length) {
      goTo(STEP_ORDER[nextIdx]);
      scrollFormToTop();
    } else {
      // Final step finished → go to the preview, where the operator
      // uploads gallery photos and submits for admin approval.
      navigate({ to: "/operator/preview" });
    }
  };
  const back = () => {
    const idx = STEP_ORDER.indexOf(state.currentStep);
    let prevIdx = idx - 1;
    if (
      state.business_type === "guide" &&
      STEP_ORDER[prevIdx] === "boat_details"
    ) {
      prevIdx -= 1;
    }
    if (prevIdx >= 0) {
      goTo(STEP_ORDER[prevIdx]);
      scrollFormToTop();
    }
  };

  if (!initialized || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <span className="text-sm text-muted-foreground">List your trip</span>
        </div>
      </header>

      {!hasListing && (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-relaxed text-emerald-900 shadow-sm sm:text-base"
          >
            <span aria-hidden="true" className="mr-1">⚓</span>
            <span className="font-semibold">Let's launch your profile!</span>{" "}
            Fill out your business details below to build your primary listing.
            During this setup, you can also add your first few trips right away.
            Don't worry if you aren't ready yet—once your listing is live, you
            can always add, edit, or manage unlimited trips from your Captain's
            Dashboard!
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-8 rounded-2xl border bg-card">
            <OnboardingSidebar
              steps={steps}
              currentStep={state.currentStep}
              onSelect={goTo}
            />
          </div>
        </aside>

        {/* Mobile stepper: horizontal chip row */}
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  s.id === state.currentStep
                    ? "border-primary bg-primary/10 text-primary"
                    : s.status === "complete"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
                      : "border-border text-muted-foreground"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            ))}
          </div>
        </div>

        <main className="min-w-0">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            {state.currentStep === "business_type" && <BusinessTypeStep onNext={advance} />}
            {state.currentStep === "profile" && (
              <ProfileStep onBack={back} onNext={advance} />
            )}
            {state.currentStep === "boat_details" && (
              <BoatDetailsStep onBack={back} onNext={advance} />
            )}
            {state.currentStep === "fishing_focus" && (
              <FishingFocusStep onBack={back} onNext={advance} />
            )}
            {state.currentStep === "trip_catalog" && (
              <TripCatalogStep onBack={back} onNext={advance} />
            )}
            {state.currentStep === "booking_rules" && (
              <BookingRulesStep onBack={back} onNext={advance} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
