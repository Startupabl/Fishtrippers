interface Vessel {
  manufacturer?: string | null;
  year?: number | null;
  length_ft?: number | null;
  num_engines?: number | null;
  horsepower_per_engine?: number | null;
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
  if (vessel.max_passenger_capacity) {
    rows.push(["Capacity", `${vessel.max_passenger_capacity} passengers`]);
  }

  if (rows.length === 0 && !boatType?.icon_url) return null;

  return (
    <section id="boat" className="scroll-mt-32 space-y-3">
      <h3 className="text-base font-semibold">Boat Specs</h3>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        {boatType?.icon_url && (
          <div className="mb-4 flex items-center justify-center rounded-xl bg-muted/40 py-3">
            <img
              src={boatType.icon_url}
              alt={boatType.subcategory_name}
              className="h-20 w-32 object-contain"
            />
          </div>
        )}
        <dl className="space-y-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-dashed pb-1.5"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-semibold text-right">{value}</dd>
            </div>
          ))}
        </dl>
        {vessel.restored && (
          <p className="mt-3 text-xs text-muted-foreground">Recently restored / refit.</p>
        )}
      </div>
    </section>
  );
}
