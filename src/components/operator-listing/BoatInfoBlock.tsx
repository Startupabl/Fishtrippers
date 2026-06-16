interface Vessel {
  manufacturer?: string | null;
  year?: number | null;
  length_ft?: number | null;
  num_engines?: number | null;
  horsepower_per_engine?: number | null;
  max_cruising_speed_knots?: number | null;
  max_passenger_capacity?: number | null;
  restored?: boolean | null;
}

interface BoatType {
  subcategory_name: string;
  icon_url: string | null;
}

interface Props {
  vessel: Vessel | null | undefined;
  boatType: BoatType | null | undefined;
}

export function BoatInfoBlock({ vessel, boatType }: Props) {
  if (!vessel) return null;

  const rows: Array<[string, string]> = [];
  if (boatType?.subcategory_name) rows.push(["Boat type", boatType.subcategory_name]);
  if (vessel.manufacturer) rows.push(["Manufacturer", vessel.manufacturer]);
  if (vessel.year) rows.push(["Year", String(vessel.year)]);
  if (vessel.length_ft) rows.push(["Length", `${vessel.length_ft} ft`]);
  if (vessel.num_engines && vessel.horsepower_per_engine) {
    rows.push(["Engines", `${vessel.num_engines} × ${vessel.horsepower_per_engine} HP`]);
  } else if (vessel.num_engines) {
    rows.push(["Engines", String(vessel.num_engines)]);
  }
  if (vessel.max_cruising_speed_knots) {
    rows.push(["Cruising speed", `${vessel.max_cruising_speed_knots} kn`]);
  }
  if (vessel.max_passenger_capacity) {
    rows.push(["Capacity", `${vessel.max_passenger_capacity} passengers`]);
  }

  if (rows.length === 0 && !boatType?.icon_url) return null;

  return (
    <section id="boat" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Boat info</h2>
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {boatType?.icon_url && (
            <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-xl bg-muted/40">
              <img
                src={boatType.icon_url}
                alt={boatType.subcategory_name}
                className="h-16 w-32 object-contain"
              />
            </div>
          )}
          <dl className="grid flex-1 grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-dashed pb-2">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {vessel.restored && (
          <p className="mt-4 text-xs text-muted-foreground">Recently restored / refit.</p>
        )}
      </div>
    </section>
  );
}
