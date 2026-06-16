import { Fish } from "lucide-react";
import { speciesLabel } from "@/lib/operators.shared";

interface Props {
  species: string[];
}

export function SpeciesGrid({ species }: Props) {
  if (!species?.length) return null;
  return (
    <section id="species" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Targeted species</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {species.map((id) => (
          <div
            key={id}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Fish className="h-7 w-7 text-foreground/70" />
            </div>
            <span className="text-sm font-medium">{speciesLabel(id)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
