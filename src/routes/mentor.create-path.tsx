import { useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthStore } from "@/stores/useAuthStore";
import {
  useOperatorOnboardingStore,
  isProfileValid,
  isBoatDetailsValid,
  isFishingFocusValid,
  isBookingRulesValid,
  type StepId,
} from "@/stores/useOperatorOnboardingStore";
import { getMyOperator } from "@/lib/operators.functions";
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
import { ReviewSubmitStep } from "@/components/operator-onboarding/steps/ReviewSubmitStep";
import { SubmittedScreen } from "@/components/operator-onboarding/SubmittedScreen";
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
  "review",
];

function CreatePathPage() {
  const navigate = useNavigate();
  const initialized = useAuthStore((s) => s.initialized);
  const authUser = useAuthStore((s) => s.user);

  const state = useOperatorOnboardingStore();
  const fetchMine = useServerFn(getMyOperator);

  // Redirect to /login if not authenticated.
  useEffect(() => {
    if (initialized && !authUser) {
      navigate({ to: "/login", search: { redirect: "/mentor/create-path" } as any });
    }
  }, [initialized, authUser, navigate]);

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
      if (id === "booking_rules") return rulesOk ? "complete" : "upcoming";
      if (id === "review") return "upcoming";
      return "upcoming";
    };

    return [
      { id: "business_type", label: "Business type", status: status("business_type") },
      { id: "profile", label: "Profile", status: status("profile") },
      { id: "boat_details", label: "Boat details", status: status("boat_details") },
      { id: "fishing_focus", label: "Fishing focus", status: status("fishing_focus") },
      { id: "booking_rules", label: "Booking rules", status: status("booking_rules") },
      { id: "review", label: "Review & submit", status: status("review") },
    ];
  }, [state]);

  const goTo = (id: StepId) => state.setStep(id);

  const advance = () => {
    const idx = STEP_ORDER.indexOf(state.currentStep);
    let nextIdx = idx + 1;
    // Skip boat_details for guides
    if (
      state.business_type === "guide" &&
      STEP_ORDER[nextIdx] === "boat_details"
    ) {
      nextIdx += 1;
    }
    if (nextIdx < STEP_ORDER.length) goTo(STEP_ORDER[nextIdx]);
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
    if (prevIdx >= 0) goTo(STEP_ORDER[prevIdx]);
  };

  if (!initialized || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (state.submitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
            <Logo />
          </div>
        </header>
        <SubmittedScreen />
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
            {state.currentStep === "booking_rules" && (
              <BookingRulesStep onBack={back} onNext={advance} />
            )}
            {state.currentStep === "review" && <ReviewSubmitStep onBack={back} />}
          </div>
        </main>
      </div>
    </div>
  );
}
