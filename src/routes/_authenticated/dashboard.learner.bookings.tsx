import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Ship, CalendarDays, Users, Loader2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMyTripBookingsLearner } from "@/lib/trip-bookings.functions";
import { getMyReviewedBookingIds } from "@/lib/reviews.functions";
import { WriteTripReviewDialog } from "@/components/reviews/WriteTripReviewDialog";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export const Route = createFileRoute("/_authenticated/dashboard/learner/bookings")({
  head: () => ({ meta: [{ title: "My Trip Bookings — FishTrippers" }] }),
  component: TripBookingsPage,
});

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return { label: "Confirmed", variant: "default" as const };
    case "completed":
      return { label: "Completed", variant: "default" as const };
    case "pending_offer":
      return { label: "Pending offer", variant: "secondary" as const };
    case "pending_payment":
      return { label: "Awaiting payment", variant: "secondary" as const };
    default:
      return { label: status, variant: "secondary" as const };
  }
}

function TripBookingsPage() {
  const fetchBookings = useServerFn(listMyTripBookingsLearner);
  const fetchReviewed = useServerFn(getMyReviewedBookingIds);
  const currency = useCurrencyStore((s) => s.currency);
  const [reviewTarget, setReviewTarget] = useState<
    { bookingId: string; tripTitle: string } | null
  >(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["learner-trip-bookings"],
    queryFn: () => fetchBookings(),
  });
  const { data: reviewedIds } = useQuery({
    queryKey: ["my-reviewed-bookings"],
    queryFn: () => fetchReviewed(),
  });
  const reviewedSet = new Set(reviewedIds ?? []);

  const fmt = (m: number, c: string) =>
    formatCurrency(convertMinor(m, c as CurrencyCode, currency), currency);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
      <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
        My Trip Bookings
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Charters and guided trips you've reserved with your captain.
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

      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card className="mt-10 rounded-2xl border-dashed p-10 text-center">
          <Ship className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-base font-semibold text-foreground" style={lora}>
            No trip bookings yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you book a charter or guided trip, it will appear here.
          </p>
        </Card>
      )}

      <div className="mt-6 grid gap-4">
        {(data ?? []).map((b) => {
          const dateLabel = b.trip_date
            ? (() => {
                try {
                  return format(parseISO(b.trip_date), "EEEE, MMMM d, yyyy");
                } catch {
                  return b.trip_date;
                }
              })()
            : "Date TBD";
          const sb = statusBadge(b.status);
          const isCompleted = b.status === "completed";
          const alreadyReviewed = reviewedSet.has(b.id);
          return (
            <Card key={b.id} className="rounded-2xl border-border/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-foreground" style={lora}>
                      {b.trip_title ?? "Trip"}
                    </p>
                    <Badge variant={sb.variant}>{sb.label}</Badge>
                    {b.is_simulated && (
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        Simulated
                      </Badge>
                    )}
                  </div>
                  {b.operator_display_name && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      with {b.operator_display_name}
                      {b.captain_name ? ` (Captain ${b.captain_name})` : ""}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" /> {dateLabel}
                      {b.trip_start_time ? ` • ${b.trip_start_time.slice(0, 5)}` : ""}
                    </span>
                    {b.guests != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-4" /> {b.guests}{" "}
                        {b.guests === 1 ? "angler" : "anglers"}
                      </span>
                    )}
                  </div>

                  {isCompleted && !alreadyReviewed && (
                    <Button
                      className="mt-4"
                      onClick={() =>
                        setReviewTarget({
                          bookingId: b.id,
                          tripTitle: b.trip_title ?? "Your trip",
                        })
                      }
                    >
                      <Star className="mr-2 size-4" />
                      Write a Review
                    </Button>
                  )}
                  {isCompleted && alreadyReviewed && (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      Review submitted
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total
                  </p>
                  <p className="text-xl font-bold text-foreground" style={lora}>
                    {fmt(b.total_price_minor, b.currency)}
                  </p>
                  {b.deposit_minor != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Deposit paid: {fmt(b.deposit_minor, b.currency)}
                      {b.balance_due_minor != null && b.balance_due_minor > 0
                        ? ` • Balance due dockside: ${fmt(b.balance_due_minor, b.currency)}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {reviewTarget && (
        <WriteTripReviewDialog
          open={!!reviewTarget}
          onOpenChange={(o) => !o && setReviewTarget(null)}
          bookingId={reviewTarget.bookingId}
          tripTitle={reviewTarget.tripTitle}
        />
      )}
    </div>
  );
}
