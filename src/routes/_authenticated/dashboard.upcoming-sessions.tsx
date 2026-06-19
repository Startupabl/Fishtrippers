import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  listMyTripBookingsAide,
  markTripBookingComplete,
  cancelPendingTripOffer,
} from "@/lib/trip-bookings.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

export const Route = createFileRoute(
  "/_authenticated/dashboard/upcoming-sessions",
)({
  head: () => ({ meta: [{ title: "My Schedule — FishTrippers" }] }),
  component: UpcomingSessionsPage,
});

function UpcomingSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchTripBookings = useServerFn(listMyTripBookingsAide);
  const markTripCompleteFn = useServerFn(markTripBookingComplete);
  const cancelTripOfferFn = useServerFn(cancelPendingTripOffer);

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data: tripBookings } = useQuery({
    queryKey: ["aide-trip-bookings", user?.id],
    queryFn: () => fetchTripBookings(),
    enabled: !!user,
  });

  const [tripActionBusy, setTripActionBusy] = useState<string | null>(null);

  async function handleMarkTripComplete(bookingId: string) {
    setTripActionBusy(bookingId);
    try {
      await markTripCompleteFn({ data: { booking_id: bookingId } });
      toast.success("Trip marked complete.");
      await queryClient.invalidateQueries({ queryKey: ["aide-trip-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark complete.");
    } finally {
      setTripActionBusy(null);
    }
  }

  async function handleCancelOffer(bookingId: string) {
    setTripActionBusy(bookingId);
    try {
      await cancelTripOfferFn({ data: { booking_id: bookingId } });
      toast.success("Offer cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["aide-trip-bookings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel offer.");
    } finally {
      setTripActionBusy(null);
    }
  }

  if (!user) return null;

  const allTripBookings = tripBookings ?? [];
  // Hide instant-book rows stuck in pending_payment — those are already paid at booking time.
  const visibleBookings = allTripBookings.filter(
    (b) => !(b.status === "pending_payment" && b.source === "instant_book"),
  );
  const upcomingTripBookings = visibleBookings.filter((b) => b.status !== "completed");
  const completedTripBookings = visibleBookings.filter((b) => b.status === "completed");

  const renderTripBookingsTable = (
    rows: typeof allTripBookings,
    mode: "upcoming" | "completed",
  ) => (
    <div className="mt-3 w-full overflow-x-auto rounded-md border border-border">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Date</TableHead>
            <TableHead className="font-bold">Trip Type</TableHead>
            <TableHead className="font-bold">Angler</TableHead>
            <TableHead className="font-bold">Guests</TableHead>
            <TableHead className="font-bold">Status</TableHead>
            <TableHead className="font-bold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                {mode === "upcoming"
                  ? "No trip bookings yet. Share your listing to attract anglers."
                  : "No completed trips yet."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((b) => {
              const sourceLabel =
                b.source === "custom_offer" ? "Custom Offer" : "Instant Book";
              const statusLabel =
                b.status === "pending_offer"
                  ? "Pending Offer"
                  : b.status === "pending_payment"
                    ? "Pending Payment"
                    : b.status === "confirmed"
                      ? "Confirmed"
                      : b.status === "completed"
                        ? "Completed"
                        : b.status;
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.trip_date}
                    {b.trip_start_time ? ` • ${b.trip_start_time.slice(0, 5)}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.trip_title ?? "Trip"}</div>
                    <div className="text-xs text-muted-foreground">({sourceLabel})</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {b.primary_angler_name ?? b.learner_name ?? "—"}
                    </div>
                    {b.phone && (
                      <div className="text-xs text-muted-foreground">{b.phone}</div>
                    )}
                  </TableCell>
                  <TableCell>{b.guests ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.status === "confirmed" || b.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabel}
                    </Badge>
                    {b.is_simulated && (
                      <Badge variant="outline" className="ml-1 border-amber-500 text-amber-700">
                        Sim
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {mode === "upcoming" && b.status === "pending_offer" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={tripActionBusy === b.id}
                        onClick={() => handleCancelOffer(b.id)}
                      >
                        {tripActionBusy === b.id ? "…" : "Cancel Offer"}
                      </Button>
                    )}
                    {mode === "upcoming" && b.status === "confirmed" && (
                      <Button
                        size="sm"
                        disabled={tripActionBusy === b.id}
                        onClick={() => handleMarkTripComplete(b.id)}
                      >
                        {tripActionBusy === b.id ? "…" : "Mark as Complete"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight" style={display}>
        My Schedule
      </h1>
      <p className="mt-2 text-muted-foreground">
        Every booked trip — including pending custom offers.
      </p>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming{" "}
            {upcomingTripBookings.length > 0 && `(${upcomingTripBookings.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed{" "}
            {completedTripBookings.length > 0 && `(${completedTripBookings.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {renderTripBookingsTable(upcomingTripBookings, "upcoming")}
        </TabsContent>

        <TabsContent value="completed">
          {renderTripBookingsTable(completedTripBookings, "completed")}
        </TabsContent>
      </Tabs>
    </main>
  );
}
