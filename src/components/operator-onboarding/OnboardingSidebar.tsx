import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepId } from "@/stores/useOperatorOnboardingStore";

export interface SidebarStep {
  id: StepId;
  label: string;
  status: "complete" | "active" | "upcoming" | "skipped";
}

interface Props {
  steps: SidebarStep[];
  currentStep: StepId;
  onSelect: (id: StepId) => void;
}

export function OnboardingSidebar({ steps, currentStep, onSelect }: Props) {
  return (
    <nav aria-label="Onboarding steps" className="flex flex-col gap-1 p-4">
      <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        List your trip
      </p>
      {steps.map((step, idx) => {
        const isActive = step.id === currentStep;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(step.id)}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              isActive && "bg-primary/10 ring-1 ring-primary/30",
              !isActive && "hover:bg-muted",
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              {step.status === "complete" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : step.status === "skipped" ? (
                <MinusCircle className="h-5 w-5 text-muted-foreground/50" />
              ) : step.status === "active" ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </span>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40" />
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                Step {idx + 1}
              </span>
              <span
                className={cn(
                  "truncate text-sm font-semibold",
                  isActive ? "text-foreground" : "text-foreground/80",
                  step.status === "skipped" && "text-muted-foreground line-through",
                )}
              >
                {step.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
