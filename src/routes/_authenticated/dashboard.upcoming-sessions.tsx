import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info, AlertTriangle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  listMyTripBookingsAide,
  markTripBookingComplete,
  cancelPendingTripOffer,
  type TripBookingSummary,
} from "@/lib/trip-bookings.functions";
import { submitCancellationDispute } from "@/lib/cancellation-disputes.functions";
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
  const submitDispute = useServerFn(submitCancellationDispute);

  const [reportTarget, setReportTarget] = useState<TripBookingSummary | null>(null);
  const [reportClaimType, setReportClaimType] =
    useState<"policy_payout" | "other">("policy_payout");
  const [reportDetails, setReportDetails] = useState("");

  const reportMutation = useMutation({
    mutationFn: (input: {
      bookingId: string;
      claimType: "policy_payout" | "other";
      details: string;
    }) => submitDispute({ data: input }),
    onSuccess: () => {
      toast.success("Claim submitted to admin team");
      setReportTarget(null);
      setReportDetails("");
      setReportClaimType("policy_payout");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to submit claim"),
  });

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
  const upcomingTripBookings = visibleBookings.filter(
    (b) => b.status !== "completed" && b.status !== "cancelled",
  );
  const completedTripBookings = visibleBookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled",
  );

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
              const isCancelled = b.status === "cancelled";
              const statusLabel =
                b.status === "pending_offer"
                  ? "Pending Offer"
                  : b.status === "pending_payment"
                    ? "Pending Payment"
                    : b.status === "confirmed"
                      ? "Confirmed"
                      : b.status === "completed"
                        ? "Completed"
                        : b.status === "cancelled"
                          ? "Cancelled"
                          : b.status;

              // 48h Report Issue window from scheduled departure
              let reportWindowOpen = false;
              if (isCancelled && b.trip_date) {
                const startStr = `${b.trip_date}T${(b.trip_start_time ?? "08:00:00").slice(0, 8)}`;
                const startMs = new Date(startStr).getTime();
                if (!Number.isNaN(startMs)) {
                  const now = Date.now();
                  reportWindowOpen =
                    now >= startMs && now <= startMs + 48 * 60 * 60 * 1000;
                }
              }

              return (
                <TableRow
                  key={b.id}
                  className={
                    isCancelled
                      ? "bg-gray-100 text-muted-foreground hover:bg-gray-100"
                      : undefined
                  }
                >
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
                    <div className="inline-flex items-center gap-1.5">
                      {isCancelled ? (
                        <>
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            Cancelled
                          </Badge>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="View cancellation reason"
                                  className="inline-flex text-muted-foreground hover:text-foreground"
                                >
                                  <Info className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {b.angler_written_reason
                                  ? b.angler_written_reason
                                  : "No reason provided."}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      ) : (
                        <Badge
                          variant={
                            b.status === "confirmed" || b.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {statusLabel}
                        </Badge>
                      )}
                      {b.is_simulated && (
                        <Badge variant="outline" className="border-amber-500 text-amber-700">
                          Sim
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isCancelled ? (
                      reportWindowOpen ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() =>
                            toast.message(
                              "Report submitted to our support team. We'll review and reach out shortly.",
                            )
                          }
                        >
                          <AlertTriangle className="mr-1.5 size-4" />
                          Report Issue
                        </Button>
                      ) : null
                    ) : (
                      <>
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
                      </>
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
