import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isBefore,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";

export type AvailabilityMap = Record<string, "booked" | "blocked">;

interface Props {
  startMonth?: Date;
  monthsCount?: number;
  availability: AvailabilityMap;
  /** ISO YYYY-MM-DD strings the user has selected in the current editing batch */
  selectedDates: Set<string>;
  onToggleDate: (iso: string) => void;
}

function MonthGrid({
  monthStart,
  availability,
  selectedDates,
  onToggleDate,
}: {
  monthStart: Date;
} & Pick<Props, "availability" | "selectedDates" | "onToggleDate">) {
  const today = startOfDay(new Date());
  const monthEnd = endOfMonth(monthStart);
  const firstDow = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 text-sm font-semibold">
        {format(monthStart, "MMMM yyyy")}
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-9" />;
          const iso = format(d, "yyyy-MM-dd");
          const past = isBefore(d, today);
          const dbStatus = availability[iso];
          const isSelected = selectedDates.has(iso);
          const isBooked = dbStatus === "booked";
          const isBlocked = dbStatus === "blocked";
          return (
            <button
              key={i}
              type="button"
              disabled={past || isBooked}
              onClick={() => onToggleDate(iso)}
              className={cn(
                "h-9 rounded-md text-xs transition",
                past && "text-muted-foreground/40 cursor-not-allowed",
                !past && !isBooked && !isBlocked && !isSelected &&
                  "hover:bg-emerald-50 text-foreground",
                isBlocked && !isSelected && "bg-zinc-200 text-zinc-700",
                isBooked && "bg-amber-200 text-amber-900 cursor-not-allowed",
                isSelected && "ring-2 ring-emerald-500 bg-emerald-100",
              )}
              title={
                isBooked
                  ? "Booked"
                  : isBlocked
                  ? "Blocked"
                  : past
                  ? "Past"
                  : "Available — click to block"
              }
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MasterCalendarGrid(props: Props) {
  const { startMonth = startOfMonth(new Date()), monthsCount = 12 } = props;
  const months = useMemo(
    () =>
      Array.from({ length: monthsCount }, (_, i) =>
        addMonths(startMonth, i),
      ),
    [startMonth, monthsCount],
  );
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {months.map((m) => (
        <MonthGrid
          key={m.toISOString()}
          monthStart={m}
          availability={props.availability}
          selectedDates={props.selectedDates}
          onToggleDate={props.onToggleDate}
        />
      ))}
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-card border" /> Available
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-zinc-200" /> Blocked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-amber-200" /> Booked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded ring-2 ring-emerald-500 bg-emerald-100" />{" "}
        Selected
      </span>
    </div>
  );
}
