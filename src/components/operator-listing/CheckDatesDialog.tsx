import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTripDateAvailability } from "@/lib/host-availability.functions";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  hostId: string;
  tripTitle: string;
  guests: number;
  onDateAvailability?: (info: {
    date: string | null;
    remaining: number | null;
    isShared: boolean;
  }) => void;
}

export function CheckDatesDialog({
  open,
  onOpenChange,
  tripId,
  hostId,
  tripTitle,
  guests,
  onDateAvailability,
}: Props) {
  const navigate = useNavigate();
  const fetchAvailability = useServerFn(getTripDateAvailability);

  const { data, isLoading } = useQuery({
    queryKey: ["trip-date-availability", tripId, hostId],
    queryFn: () =>
      fetchAvailability({ data: { trip_id: tripId, host_id: hostId } }),
    enabled: open && !!hostId && !!tripId,
  });

  const isShared = data?.charter_type === "shared_tour";
  const seatsAvailable = data?.seats_available ?? 0;

  const blockedSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of data?.blockedDates ?? []) set.add(d);
    return set;
  }, [data]);

  const remainingFor = (iso: string) => {
    if (!isShared) return null;
    const booked = data?.bookedByDate[iso] ?? 0;
    return Math.max(0, seatsAvailable - booked);
  };

  const [selected, setSelected] = useState<Date | undefined>(undefined);

  const selectedIso = selected ? format(selected, "yyyy-MM-dd") : null;
  const selectedRemaining = selectedIso ? remainingFor(selectedIso) : null;

  useEffect(() => {
    if (!onDateAvailability) return;
    onDateAvailability({
      date: selectedIso,
      remaining: selectedRemaining,
      isShared: !!isShared,
    });
  }, [selectedIso, selectedRemaining, isShared, onDateAvailability]);

  const overCapacity =
    isShared && selectedRemaining !== null && guests > selectedRemaining;
  const soldOut =
    isShared && selectedRemaining !== null && selectedRemaining <= 0;

  const handleConfirm = () => {
    if (!selected || !selectedIso) return;
    if (soldOut || overCapacity) return;
    onOpenChange(false);
    navigate({
      to: "/checkout",
      search: { trip_id: tripId, trip_date: selectedIso, guests } as never,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pick a date — {tripTitle}</DialogTitle>
          <DialogDescription>
            {isShared
              ? "Sold-out dates are greyed out. Pick a date to see remaining seats."
              : "Greyed-out dates are unavailable. Pick an open date to continue to checkout."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={(d) => {
              if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
              const iso = format(d, "yyyy-MM-dd");
              if (isShared) {
                if (blockedSet.has(iso)) return true;
                return (remainingFor(iso) ?? 0) <= 0;
              }
              return blockedSet.has(iso);
            }}
            className={cn("rounded-md border p-3 pointer-events-auto")}
            initialFocus
          />
        </div>

        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground">
            Loading dates…
          </p>
        ) : null}

        {isShared && selected && selectedRemaining !== null ? (
          soldOut ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm font-semibold text-destructive">
              Sold Out for this date
            </div>
          ) : (
            <div
              className={cn(
                "rounded-md px-3 py-2 text-center text-sm font-medium",
                overCapacity
                  ? "bg-amber-50 text-amber-900"
                  : "bg-emerald-50 text-emerald-900",
              )}
            >
              {overCapacity
                ? `Only ${selectedRemaining} seat${selectedRemaining === 1 ? "" : "s"} left — reduce your guest count to continue.`
                : `${selectedRemaining} seat${selectedRemaining === 1 ? "" : "s"} left on ${format(selected, "MMM d, yyyy")}`}
            </div>
          )
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || soldOut || overCapacity}
            onClick={handleConfirm}
          >
            {selected
              ? `Continue with ${format(selected, "MMM d, yyyy")}`
              : "Pick a date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
