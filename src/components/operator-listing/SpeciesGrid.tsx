import { speciesLabel } from "@/lib/operators.shared";

interface Props {
  species: string[];
}

export function SpeciesGrid({ species }: Props) {
  if (!species?.length) return null;
  return (
    <section id="species" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Targeted species</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {species.map((id) => (
          <div
            key={id}
            className="flex aspect-square items-center justify-center rounded-2xl border bg-card/60 p-4 text-center transition-shadow hover:shadow-sm"
          >
            <span className="text-sm font-medium leading-tight">{speciesLabel(id)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
