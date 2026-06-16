import { Fish } from "lucide-react";
import { speciesLabel } from "@/lib/operators.shared";
import { getSpeciesIcon } from "@/assets/species-icons";

interface Props {
  species: string[];
}

export function SpeciesGrid({ species }: Props) {
  if (!species?.length) return null;
  return (
    <section id="species" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Targeted species</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {species.map((id) => {
          const icon = getSpeciesIcon(id);
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-card/60 p-5 text-center transition-shadow hover:shadow-sm"
            >
              <div className="flex h-20 w-20 items-center justify-center">
                {icon ? (
                  <img
                    src={icon}
                    alt={speciesLabel(id)}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Fish className="h-10 w-10 text-foreground/70" />
                )}
              </div>
              <span className="text-sm font-medium">{speciesLabel(id)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
