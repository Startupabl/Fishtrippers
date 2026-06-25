import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FISHING_ENVIRONMENTS } from "@/lib/operators.shared";
import {
  isFishingFocusValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";
import { SpeciesMultiSelect } from "./SpeciesMultiSelect";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function FishingFocusStep({ onBack, onNext }: Props) {
  const target_species = useOperatorOnboardingStore((s) => s.target_species);
  const fishing_environments = useOperatorOnboardingStore((s) => s.fishing_environments);
  const toggleSpecies = useOperatorOnboardingStore((s) => s.toggleSpecies);
  const toggleEnvironment = useOperatorOnboardingStore((s) => s.toggleEnvironment);
  const valid = useOperatorOnboardingStore(isFishingFocusValid);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fishing focus</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you specialize in. This drives where you appear in search and which trip
          templates we suggest next.
        </p>
      </header>

      {/* Fishing Environments */}
      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fishing environments</h2>
            <p className="text-sm text-muted-foreground">
              Pick every environment you fish. Captains can serve multiple. At least one is required.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{fishing_environments.length}</span> selected
          </div>
        </div>
        <div
          role="group"
          aria-label="Fishing environments"
          className="grid gap-3 sm:grid-cols-2"
        >
          {FISHING_ENVIRONMENTS.map((env) => {
            const Icon = env.icon;
            const selected = fishing_environments.includes(env.id);
            return (
              <button
                key={env.id}
                type="button"
                onClick={() => toggleEnvironment(env.id)}
                aria-pressed={selected}
                className={cn(
                  "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                {selected && (
                  <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
                )}
                <Icon
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0">
                  <div className="font-semibold">{env.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{env.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Target Species */}
      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Targeted Species</h2>
            <p className="text-sm text-muted-foreground">
              Start typing to find a species, then click to add it. At least one is required.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{target_species.length}</span> selected
          </div>
        </div>

        <SpeciesMultiSelect selected={target_species} onToggle={toggleSpecies} />
      </section>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!valid} onClick={onNext} size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
