import { Check } from "lucide-react";
import { BOAT_FEATURE_GROUPS } from "@/lib/operators.shared";

interface Props {
  features: Record<string, string> | null | undefined;
}

export function AmenitiesGrid({ features }: Props) {
  const selected = new Set(Object.keys(features ?? {}));
  if (selected.size === 0) return null;

  return (
    <section id="included" className="scroll-mt-32 space-y-3">
      <h3 className="text-base font-semibold">Equipped with</h3>
      <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
        {BOAT_FEATURE_GROUPS.map((g) => {
          const items = g.items.filter((i) => selected.has(i.id));
          if (items.length === 0) return null;
          return (
            <div key={g.id}>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h4>
              <ul className="space-y-1.5">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0">
                      <span className="font-medium">{i.label}</span>
                      {features?.[i.id] ? (
                        <span className="text-muted-foreground"> — {features[i.id]}</span>
                      ) : null}
                    </span>
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
