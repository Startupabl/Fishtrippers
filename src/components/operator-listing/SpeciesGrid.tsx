import { speciesLabel } from "@/lib/operators.shared";

interface Props {
  species: string[];
}

export function SpeciesGrid({ species }: Props) {
  if (!species?.length) return null;
  return (
    <section id="species" className="scroll-mt-32 space-y-3">
      <h3 className="text-base font-semibold">Fishing for</h3>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {species.map((id) => (
            <span
              key={id}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium"
            >
              {speciesLabel(id)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
