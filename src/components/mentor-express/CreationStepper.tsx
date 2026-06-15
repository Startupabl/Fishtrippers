import { Check } from "lucide-react";

const STEPS = ["Introduce Yourself", "Course Details", "Add Description", "Review & Publish"] as const;

export type CreationStep = 1 | 2 | 3 | 4;

interface CreationStepperProps {
  current: CreationStep;
  highestVisited: CreationStep;
  onJump?: (step: CreationStep) => void;
}

export function CreationStepper({
  current,
  highestVisited,
  onJump,
}: CreationStepperProps) {
  return (
    <nav aria-label="Listing creation progress" className="w-full">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((label, idx) => {
          const num = (idx + 1) as CreationStep;
          const isActive = num === current;
          const isComplete = num < current || num <= highestVisited - 1;
          const isClickable = !!onJump && num <= highestVisited && num !== current;

          return (
            <li key={label} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onJump?.(num)}
                className={`flex flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors sm:px-3 ${
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : isComplete
                      ? "border-emerald-300/70 bg-emerald-50/60 text-foreground"
                      : "border-border/60 bg-card/60 text-muted-foreground"
                } ${isClickable ? "hover:border-primary/60 cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden
                >
                  {isComplete && !isActive ? <Check className="size-3.5" /> : num}
                </span>
                <span className="hidden text-xs font-medium sm:inline">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-sm text-muted-foreground sm:hidden">
        Step {current} of 4 — {STEPS[current - 1]}
      </p>
    </nav>
  );
}
