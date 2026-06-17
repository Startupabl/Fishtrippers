import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MasterCalendarGrid,
  CalendarLegend,
  type AvailabilityMap,
} from "@/components/dashboard/MasterCalendarGrid";
import {
  listMyHostAvailability,
  setMyHostAvailability,
  clearMyHostAvailability,
  setAllTripsBookingType,
} from "@/lib/host-availability.functions";
import { listMyTrips } from "@/lib/trips.functions";
import { Zap, MessageSquare, CalendarDays, HelpCircle } from "lucide-react";
import { HowBookingsWorkDialog } from "@/components/dashboard/HowBookingsWorkDialog";

export const Route = createFileRoute("/_authenticated/dashboard/master-calendar")({
  head: () => ({
    meta: [
      { title: "Manage Availability — FishTrippers" },
      {
        name: "description",
        content:
          "Block dates and switch between Instant Book and Request to Book across all your trips.",
      },
    ],
  }),
  component: MasterCalendarPage,
});

function MasterCalendarPage() {
  const qc = useQueryClient();
  const fetchAvail = useServerFn(listMyHostAvailability);
  const fetchTrips = useServerFn(listMyTrips);
  const blockFn = useServerFn(setMyHostAvailability);
  const clearFn = useServerFn(clearMyHostAvailability);
  const setTypeFn = useServerFn(setAllTripsBookingType);

  const { data: rows = [] } = useQuery({
    queryKey: ["my-host-availability"],
    queryFn: () => fetchAvail(),
  });
  const { data: tripsRes } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => fetchTrips(),
  });

  const availability: AvailabilityMap = useMemo(() => {
    const m: AvailabilityMap = {};
    for (const r of rows) m[r.date] = r.status;
    return m;
  }, [rows]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmType, setConfirmType] =
    useState<"instant_book" | "request_to_book" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const trips = (tripsRes?.trips ?? []) as Array<{
    id: string;
    booking_type: "instant_book" | "request_to_book";
  }>;
  const instantCount = trips.filter((t) => t.booking_type === "instant_book").length;
  const requestCount = trips.length - instantCount;
  const mode: "instant_book" | "request_to_book" | "mixed" =
    trips.length === 0
      ? "request_to_book"
      : instantCount === trips.length
      ? "instant_book"
      : requestCount === trips.length
      ? "request_to_book"
      : "mixed";

  const toggle = (iso: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const blockMut = useMutation({
    mutationFn: async () => {
      const dates = Array.from(selected);
      if (!dates.length) throw new Error("Select dates first.");
      return blockFn({ data: { dates, status: "blocked" } });
    },
    onSuccess: () => {
      toast.success("Dates blocked.");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["my-host-availability"] });
      qc.invalidateQueries({ queryKey: ["operator-listing-preview"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save."),
  });

  const unblockMut = useMutation({
    mutationFn: async () => {
      const dates = Array.from(selected);
      if (!dates.length) throw new Error("Select dates first.");
      return clearFn({ data: { dates } });
    },
    onSuccess: () => {
      toast.success("Selection cleared.");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["my-host-availability"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save."),
  });

  const typeMut = useMutation({
    mutationFn: async (t: "instant_book" | "request_to_book") =>
      setTypeFn({ data: { booking_type: t } }),
    onSuccess: () => {
      toast.success("Booking mode updated for all trips.");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
      qc.invalidateQueries({ queryKey: ["operator-listing-preview"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update."),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <CalendarDays className="mr-2 inline-block size-6" />
            Manage Availability
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Block dates you can&apos;t run trips. Booked dates appear automatically
            when guests pay for an instant-book trip.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHelpOpen(true)}
          className="shrink-0"
        >
          <HelpCircle className="mr-1.5 size-4" />
          How Bookings Work
        </Button>
      </header>

      {/* Booking mode toggle */}
      <Card className="mb-6 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Booking mode
            </div>
            <div className="text-sm">
              {mode === "instant_book" && (
                <span>
                  <strong>Instant Book</strong> — all {trips.length} trip
                  {trips.length === 1 ? "" : "s"} accept automatic bookings.
                </span>
              )}
              {mode === "request_to_book" && (
                <span>
                  <strong>Request to Book</strong> — guests send you a request first.
                </span>
              )}
              {mode === "mixed" && (
                <span>
                  Mixed — {instantCount} Instant Book, {requestCount} Request to Book.
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === "request_to_book" ? "default" : "outline"}
              size="sm"
              onClick={() => setConfirmType("request_to_book")}
              disabled={typeMut.isPending || trips.length === 0}
            >
              <MessageSquare className="mr-1 size-4" /> Request to Book
            </Button>
            <Button
              variant={mode === "instant_book" ? "default" : "outline"}
              size="sm"
              onClick={() => setConfirmType("instant_book")}
              disabled={typeMut.isPending || trips.length === 0}
            >
              <Zap className="mr-1 size-4" /> Instant Book
            </Button>
          </div>
        </div>
      </Card>

      {/* Selection action bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CalendarLegend />
        <div className="flex gap-2">
          <span className="self-center text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!selected.size || unblockMut.isPending}
            onClick={() => unblockMut.mutate()}
          >
            Unblock
          </Button>
          <Button
            size="sm"
            disabled={!selected.size || blockMut.isPending}
            onClick={() => blockMut.mutate()}
          >
            Block dates
          </Button>
        </div>
      </div>

      <MasterCalendarGrid
        availability={availability}
        selectedDates={selected}
        onToggleDate={toggle}
      />

      <AlertDialog open={!!confirmType} onOpenChange={(o) => !o && setConfirmType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch all trips to {confirmType === "instant_book" ? "Instant Book" : "Request to Book"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates {trips.length} trip{trips.length === 1 ? "" : "s"}.
              You can change individual trips later in the trip editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmType) typeMut.mutate(confirmType);
                setConfirmType(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HowBookingsWorkDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
