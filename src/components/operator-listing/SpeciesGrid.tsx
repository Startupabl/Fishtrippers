import { speciesLabel } from "@/lib/operators.shared";

interface Props {
  species: string[];
}

export function SpeciesGrid({ species }: Props) {
  if (!species?.length) return null;
  return (
    <section id="species" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Fishing for</h2>
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap gap-2">
          {species.map((id) => (
            <span
              key={id}
              className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm font-medium"
            >
              {speciesLabel(id)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
