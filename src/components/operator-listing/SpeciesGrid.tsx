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
      <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 md:grid-cols-4">
        {species.map((id) => {
          const icon = getSpeciesIcon(id);
          return (
            <div
              key={id}
              className="flex h-full flex-col items-center justify-start gap-3 rounded-2xl border bg-card/60 p-5 text-center transition-shadow hover:shadow-sm"
            >
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border/60">
                {icon ? (
                  <img
                    src={icon}
                    alt={speciesLabel(id)}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="mx-auto block h-16 w-16 object-contain object-center"
                  />
                ) : (
                  <Fish className="h-9 w-9 text-foreground/70" />
                )}
              </div>
              <span className="block h-5 text-sm font-medium leading-5">{speciesLabel(id)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
