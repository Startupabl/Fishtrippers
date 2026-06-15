import { useMemo, useState } from "react";
import { Search, CheckCircle2, Waves, Fish, Trees, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PRIMARY_CATEGORIES,
  PRIMARY_CATEGORY_DETAILS,
  SPECIES_CATALOG,
  type PrimaryCategory,
} from "@/lib/operators.shared";
import {
  isFishingFocusValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

const CATEGORY_ICON: Record<PrimaryCategory, typeof Waves> = {
  offshore: Waves,
  inshore: Fish,
  freshwater: Trees,
  fly: Feather,
};

export function FishingFocusStep({ onBack, onNext }: Props) {
  const primary_category = useOperatorOnboardingStore((s) => s.primary_category);
  const target_species = useOperatorOnboardingStore((s) => s.target_species);
  const setPrimaryCategory = useOperatorOnboardingStore((s) => s.setPrimaryCategory);
  const toggleSpecies = useOperatorOnboardingStore((s) => s.toggleSpecies);
  const valid = useOperatorOnboardingStore(isFishingFocusValid);

  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    // Re-order groups so the selected category comes first.
    if (!primary_category) return SPECIES_CATALOG;
    return [...SPECIES_CATALOG].sort((a, b) =>
      a.category === primary_category ? -1 : b.category === primary_category ? 1 : 0,
    );
  }, [primary_category]);

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => i.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Fishing focus</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what you specialize in. This drives where you appear in search and which trip
          templates we suggest next.
        </p>
      </header>

      {/* Primary Category */}
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Primary category</h2>
          <p className="text-sm text-muted-foreground">Pick the one that best describes your operation.</p>
        </div>
        <div
          role="radiogroup"
          aria-label="Primary fishing category"
          className="grid gap-3 sm:grid-cols-2"
        >
          {PRIMARY_CATEGORIES.map((id) => {
            const Icon = CATEGORY_ICON[id];
            const details = PRIMARY_CATEGORY_DETAILS[id];
            const selected = primary_category === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPrimaryCategory(id)}
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
                  <div className="font-semibold">{details.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{details.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Target Species */}
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Target species</h2>
            <p className="text-sm text-muted-foreground">
              Pick every species you regularly target. At least one is required.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{target_species.length}</span> selected
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search species…"
            className="pl-9"
            aria-label="Search species"
          />
        </div>

        <div className="space-y-5">
          {filteredGroups.length === 0 && (
            <p className="text-sm text-muted-foreground">No species match “{query}”.</p>
          )}
          {filteredGroups.map((group) => (
            <div key={group.category}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const selected = target_species.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSpecies(item.id)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/40",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
