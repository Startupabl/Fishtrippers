import { Check } from "lucide-react";
import { BOAT_FEATURE_GROUPS } from "@/lib/operators.shared";

interface Props {
  features: Record<string, string> | null | undefined;
}

export function AmenitiesGrid({ features }: Props) {
  const selected = new Set(Object.keys(features ?? {}));
  if (selected.size === 0) return null;

  return (
    <section id="included" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Equipped with</h2>
      <div className="space-y-6 rounded-2xl border bg-card p-6">
        {BOAT_FEATURE_GROUPS.map((g) => {
          const items = g.items.filter((i) => selected.has(i.id));
          if (items.length === 0) return null;
          return (
            <div key={g.id}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h3>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>{i.label}</span>
                    {features?.[i.id] ? (
                      <span className="text-muted-foreground">— {features[i.id]}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
