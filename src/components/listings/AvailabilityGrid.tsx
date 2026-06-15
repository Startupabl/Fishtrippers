import { cn } from "@/lib/utils";
import { DAYS, SLOTS, type Day, type Slot, type SlotMap } from "@/lib/availability.functions";
import { COUNTRIES } from "@/lib/countries";
import { friendlyTimezoneLabel } from "@/lib/timezones";

const DAY_LABELS: Record<Day, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const SLOT_LABELS: Record<Slot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const LEAF_GREEN = "#3DA35D";

interface Props {
  slots: SlotMap | null;
  paused?: boolean;
  className?: string;
  /** ISO-2 country code of the Aide (optional) */
  country?: string | null;
  /** IANA time zone of the Aide (optional) */
  timezone?: string | null;
}

function countryName(iso2: string | null | undefined): string | null {
  if (!iso2) return null;
  const c = COUNTRIES.find((x) => x.iso2 === iso2.toUpperCase());
  return c?.name ?? null;
}

export function AvailabilityGrid({ slots, paused, className, country, timezone }: Props) {
  const cName = countryName(country);
  const hasLocation = !!cName && !!timezone;
  const subline = timezone
    ? `Times shown in the Aide's time zone: ${friendlyTimezoneLabel(timezone)}`
    : "Times shown in Aide's local time zone";

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          📅 Availability Grid
        </h2>
        <p className="text-sm text-muted-foreground">{subline}</p>
      </div>

      {paused ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This Aide is currently paused. Check back soon!
        </p>
      ) : !slots ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Availability not set yet — message the Aide to check times.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[90px_repeat(7,1fr)] bg-muted/40 text-[11px] font-medium text-muted-foreground">
            <div className="px-2 py-2"></div>
            {DAYS.map((d) => (
              <div key={d} className="px-1 py-2 text-center">
                {DAY_LABELS[d]}
              </div>
            ))}
          </div>
          {SLOTS.map((slot) => (
            <div
              key={slot}
              className="grid grid-cols-[90px_repeat(7,1fr)] border-t border-border"
            >
              <div className="flex items-center px-2 py-2 text-xs font-medium text-foreground">
                {SLOT_LABELS[slot]}
              </div>
              {DAYS.map((d) => {
                const on = !!slots[d]?.[slot];
                return (
                  <div key={d} className="flex items-center justify-center p-1.5">
                    <div
                      className={cn(
                        "h-6 w-full rounded-md",
                        on ? "" : "bg-muted",
                      )}
                      style={on ? { backgroundColor: LEAF_GREEN } : undefined}
                      aria-label={`${DAY_LABELS[d]} ${SLOT_LABELS[slot]}: ${on ? "available" : "unavailable"}`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {!hasLocation && (
        <p className="mt-3 text-xs italic text-muted-foreground">
          Please confirm exact hours and time zones directly with the Aide when
          discussing availability and scheduling.
        </p>
      )}
    </section>
  );
}
