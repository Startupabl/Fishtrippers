import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useAuthStore } from "@/stores/useAuthStore";
import { CustomOfferCard } from "@/components/chat/CustomOfferCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ship,
  Loader2,
  Star,
  CalendarPlus,
  MapPin,
  Phone,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listMyTripBookingsLearner,
  type TripBookingSummary,
} from "@/lib/trip-bookings.functions";
import { getMyReviewedBookingIds } from "@/lib/reviews.functions";
import { WriteTripReviewDialog } from "@/components/reviews/WriteTripReviewDialog";
import { TripReceiptDialog } from "@/components/earnings/TripReceiptDialog";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export const Route = createFileRoute("/_authenticated/dashboard/learner/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — FishTrippers" }] }),
  component: TripBookingsPage,
});

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          CONFIRMED
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200">
          COMPLETED
        </Badge>
      );
    case "pending_offer":
    case "pending_payment":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          PENDING OFFER
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
  }
}

function formatDate(b: TripBookingSummary) {
  if (!b.trip_date) return "Date TBD";
  try {
    return format(parseISO(b.trip_date), "EEE, MMM d, yyyy");
  } catch {
    return b.trip_date;
  }
}

function googleCalendarUrl(b: TripBookingSummary) {
  if (!b.trip_date) return "#";
  const date = b.trip_date.replace(/-/g, "");
  const time = (b.trip_start_time ?? "08:00").slice(0, 5).replace(":", "") + "00";
  const startLocal = `${date}T${time}`;
  // Add 4 hours as a default duration
  const startDt = new Date(
    `${b.trip_date}T${(b.trip_start_time ?? "08:00:00").slice(0, 8)}`,
  );
  const endDt = new Date(startDt.getTime() + 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const endLocal =
    `${endDt.getFullYear()}${pad(endDt.getMonth() + 1)}${pad(endDt.getDate())}` +
    `T${pad(endDt.getHours())}${pad(endDt.getMinutes())}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: b.trip_title ?? "Fishing trip",
    dates: `${startLocal}/${endLocal}`,
    details: `Trip with Captain ${b.captain_name ?? ""}${
      b.captain_phone ? ` • ${b.captain_phone}` : ""
    }`,
    location: b.meeting_location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location,
  )}`;
}

function TripBookingsPage() {
  const fetchBookings = useServerFn(listMyTripBookingsLearner);
  const fetchReviewed = useServerFn(getMyReviewedBookingIds);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [reviewTarget, setReviewTarget] = useState<
    { bookingId: string; tripTitle: string } | null
  >(null);
  const [receiptTarget, setReceiptTarget] = useState<TripBookingSummary | null>(
    null,
  );
  const [offerTarget, setOfferTarget] = useState<TripBookingSummary | null>(
    null,
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["learner-trip-bookings"],
    queryFn: () => fetchBookings(),
  });
  const { data: reviewedIds } = useQuery({
    queryKey: ["my-reviewed-bookings"],
    queryFn: () => fetchReviewed(),
  });
  const reviewedSet = useMemo(() => new Set(reviewedIds ?? []), [reviewedIds]);

  const { upcoming, past } = useMemo(() => {
    const rows = data ?? [];
    const up = rows.filter(
      (b) =>
        b.status === "confirmed" ||
        b.status === "pending_offer" ||
        b.status === "pending_payment",
    );
    const pa = rows.filter((b) => b.status === "completed");
    return { upcoming: up, past: pa };
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
        My Bookings
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upcoming and past trips you've booked with captains.
      </p>

      {isLoading && (
        <div className="mt-12 flex justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}

      {error && (
        <p className="mt-8 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      {!isLoading && !error && (
        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming Trips ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Trips ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <BookingsTable
              rows={upcoming}
              emptyText="No upcoming trips. Book a charter to see it here."
              renderAction={(b) => {
                if (b.status === "pending_offer" || b.status === "pending_payment") {
                  return (
                    <Button
                      size="sm"
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      onClick={() => setOfferTarget(b)}
                    >
                      Review & Accept Offer
                    </Button>
                  );
                }
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReceiptTarget(b)}
                  >
                    <ReceiptIcon className="mr-1.5 size-4" />
                    View Receipt
                  </Button>
                );
              }}
            />
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            <BookingsTable
              rows={past}
              emptyText="No completed trips yet."
              renderAction={(b) => {
                const reviewed = reviewedSet.has(b.id);
                if (reviewed) {
                  return (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      Review submitted
                    </span>
                  );
                }
                return (
                  <Button
                    size="sm"
                    onClick={() =>
                      setReviewTarget({
                        bookingId: b.id,
                        tripTitle: b.trip_title ?? "Your trip",
                      })
                    }
                  >
                    <Star className="mr-1.5 size-4" />
                    Write a Review
                  </Button>
                );
              }}
            />
          </TabsContent>
        </Tabs>
      )}

      {reviewTarget && (
        <WriteTripReviewDialog
          open={!!reviewTarget}
          onOpenChange={(o) => !o && setReviewTarget(null)}
          bookingId={reviewTarget.bookingId}
          tripTitle={reviewTarget.tripTitle}
        />
      )}

      <TripReceiptDialog
        booking={receiptTarget}
        captainName={receiptTarget?.captain_name ?? "Your captain"}
        onOpenChange={(o) => !o && setReceiptTarget(null)}
      />

      <Dialog
        open={!!offerTarget}
        onOpenChange={(o) => !o && setOfferTarget(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom Trip Offer</DialogTitle>
          </DialogHeader>
          {offerTarget && (
            <CustomOfferCard
              bookingId={offerTarget.id}
              viewerId={user?.id}
              onChanged={() => {
                queryClient.invalidateQueries({
                  queryKey: ["learner-trip-bookings"],
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingsTable({
  rows,
  emptyText,
  renderAction,
}: {
  rows: TripBookingSummary[];
  emptyText: string;
  renderAction: (b: TripBookingSummary) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed p-10 text-center">
        <Ship className="mx-auto size-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      </Card>
    );
  }
  return (
    <Card className="rounded-2xl border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date &amp; Time</TableHead>
            <TableHead>Charter &amp; Captain</TableHead>
            <TableHead>Trip Details</TableHead>
            <TableHead>Meeting Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="align-top">
                <div className="flex items-start gap-2">
                  <div>
                    <div className="font-medium text-foreground">
                      {formatDate(b)}
                    </div>
                    {b.trip_start_time && (
                      <div className="text-xs text-muted-foreground">
                        {b.trip_start_time.slice(0, 5)}
                      </div>
                    )}
                  </div>
                  <a
                    href={googleCalendarUrl(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Add to Google Calendar"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <CalendarPlus className="size-4" />
                  </a>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="font-bold text-foreground" style={lora}>
                  {b.trip_title ?? "Trip"}
                </div>
                {b.captain_name && (
                  <div className="text-sm text-muted-foreground">
                    Captain {b.captain_name}
                  </div>
                )}
                {b.captain_phone && (
                  <a
                    href={`tel:${b.captain_phone}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Phone className="size-3" />
                    {b.captain_phone}
                  </a>
                )}
              </TableCell>
              <TableCell className="align-top">
                <div className="text-sm text-foreground">
                  {b.trip_title ?? "—"}
                </div>
                {b.guests != null && (
                  <div className="text-xs text-muted-foreground">
                    {b.guests} {b.guests === 1 ? "guest" : "guests"}
                  </div>
                )}
              </TableCell>
              <TableCell className="align-top">
                {b.meeting_location ? (
                  <a
                    href={mapsUrl(b.meeting_location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 text-sm text-foreground hover:text-primary"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <span className="underline-offset-2 hover:underline">
                      {b.meeting_location}
                    </span>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Captain will share location
                  </span>
                )}
              </TableCell>
              <TableCell className="align-top">{statusBadge(b.status)}</TableCell>
              <TableCell className="align-top text-right">
                {renderAction(b)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
