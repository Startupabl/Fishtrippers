import { Check } from "lucide-react";
import { featureLabel } from "@/lib/operators.shared";

interface Props {
  features: Record<string, string> | null | undefined;
}

export function FeaturesCard({ features }: Props) {
  const ids = Object.keys(features ?? {});
  if (ids.length === 0) return null;
  const top = ids.slice(0, 6);
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-3 text-base font-semibold">Popular features</h3>
      <ul className="space-y-2 text-sm">
        {top.map((id) => (
          <li key={id} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{featureLabel(id)}</span>
          </li>
        ))}
      </ul>
      {ids.length > top.length && (
        <div className="mt-3 text-xs text-muted-foreground">
          + {ids.length - top.length} more
        </div>
      )}
    </div>
  );
}
