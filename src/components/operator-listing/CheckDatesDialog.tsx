import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
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
import { getPublicHostAvailability } from "@/lib/host-availability.functions";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  hostId: string;
  tripTitle: string;
  guests: number;
}

export function CheckDatesDialog({
  open,
  onOpenChange,
  tripId,
  hostId,
  tripTitle,
  guests,
}: Props) {
  const navigate = useNavigate();
  const fetchAvailability = useServerFn(getPublicHostAvailability);

  const { data, isLoading } = useQuery({
    queryKey: ["public-host-availability", hostId],
    queryFn: () => fetchAvailability({ data: { host_id: hostId } }),
    enabled: open && !!hostId,
  });

  const disabledDates = useMemo(() => {
    const set = new Set<string>();
    for (const row of data ?? []) set.add(row.date);
    return set;
  }, [data]);

  const [selected, setSelected] = useState<Date | undefined>(undefined);

  const handleConfirm = () => {
    if (!selected) return;
    const iso = format(selected, "yyyy-MM-dd");
    onOpenChange(false);
    navigate({
      to: "/checkout",
      search: { trip_id: tripId, trip_date: iso, guests } as never,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pick a date — {tripTitle}</DialogTitle>
          <DialogDescription>
            Greyed-out dates are unavailable. Pick an open date to continue to checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={(d) => {
              if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
              return disabledDates.has(format(d, "yyyy-MM-dd"));
            }}
            className={cn("rounded-md border p-3 pointer-events-auto")}
            initialFocus
          />
        </div>

        {isLoading ? (
          <p className="text-center text-xs text-muted-foreground">Loading dates…</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={handleConfirm}>
            {selected
              ? `Continue with ${format(selected, "MMM d, yyyy")}`
              : "Pick a date"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
