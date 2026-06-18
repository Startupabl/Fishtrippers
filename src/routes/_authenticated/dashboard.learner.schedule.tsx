import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Award, Star, CalendarPlus, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  listMyOrdersLearner,
  listSessionCompletions,
} from "@/lib/orders.functions";
import { getClassSessionForOrder } from "@/lib/bookings.functions";
import { buildGoogleCalendarUrl } from "@/lib/calendar-links";
import { ensureThreadForJourney } from "@/lib/messages.functions";
import { getMyReviewedOrderIds } from "@/lib/reviews.functions";
import { WriteReviewDialog } from "@/components/reviews/WriteReviewDialog";
import { cn } from "@/lib/utils";
import { RescheduleProposalsSection } from "@/components/schedule/RescheduleProposalsSection";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

export const Route = createFileRoute(
  "/_authenticated/dashboard/learner/schedule",
)({
  head: () => ({ meta: [{ title: "My Schedule — FishTrippers" }] }),
  component: LearnerSchedule,
});

interface SessionRow {
  orderId: string;
  sessionNumber: number;
  totalSessions: number;
  courseTitle: string;
  instructorName: string;
  startIso: string;
  durationMinutes: number;
  orderStatus: string;
  journeyId: string | null;
}

function fmtSessionTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${date} — ${time}`;
  } catch {
    return "—";
  }
}

function LearnerSchedule() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listMyOrdersLearner);
  const fetchCohort = useServerFn(getClassSessionForOrder);
  const listCompletionsFn = useServerFn(listSessionCompletions);

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["learner-orders-count", user?.id],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  const orderList = orders ?? [];
  const orderIds = orderList.map((o) => o.id);

  const cohortQueries = useQueries({
    queries: orderList.map((o) => ({
      queryKey: ["class-session-for-order", o.id],
      queryFn: () => fetchCohort({ data: { order_id: o.id } }),
      enabled: !!user,
    })),
  });

  const { data: completions } = useQuery({
    queryKey: ["session-completions", "learner", orderIds.join(",")],
    queryFn: () => listCompletionsFn({ data: { order_ids: orderIds } }),
    enabled: !!user && orderIds.length > 0,
  });

  const fetchReviewedFn = useServerFn(getMyReviewedOrderIds);
  const { data: reviewedOrderIds } = useQuery({
    queryKey: ["my-reviewed-orders", user?.id],
    queryFn: () => fetchReviewedFn(),
    enabled: !!user,
  });
  const reviewedSet = useMemo(
    () => new Set(reviewedOrderIds ?? []),
    [reviewedOrderIds],
  );

  const completedSet = useMemo(() => {
    const set = new Set<string>();
    (completions ?? []).forEach((c) =>
      set.add(`${c.order_id}:${c.session_index}`),
    );
    return set;
  }, [completions]);

  // Fallback: orders where every session is marked complete, even if
  // order_status was never flipped to 'completed'.
  const fullyDoneOrderIds = useMemo(() => {
    const counts = new Map<string, number>();
    (completions ?? []).forEach((c) => {
      counts.set(c.order_id, (counts.get(c.order_id) ?? 0) + 1);
    });
    const totalsByOrder = new Map<string, number>();
    orderList.forEach((o, i) => {
      const cohort = cohortQueries[i]?.data;
      const total =
        (cohort?.session_dates_times_array?.length ?? 0) ||
        (o.snapshot_session_titles?.length ?? 0) ||
        (o.snapshot_total_sessions ?? 0);
      if (total > 0) totalsByOrder.set(o.id, total);
    });
    const set = new Set<string>();
    totalsByOrder.forEach((total, orderId) => {
      if ((counts.get(orderId) ?? 0) >= total) set.add(orderId);
    });
    return set;
  }, [completions, orderList, cohortQueries.map((q) => q.dataUpdatedAt).join("|")]);

  const rows: SessionRow[] = useMemo(() => {
    const out: SessionRow[] = [];
    orderList.forEach((o, i) => {
      const cohort = cohortQueries[i]?.data;
      const fallbackDuration = o.snapshot_session_duration ?? 60;
      const title =
        cohort?.listing_title ?? o.snapshot_course_title ?? "Fishing Trip session";

      const unified =
        cohort && (cohort.session_dates_times_array?.length ?? 0) > 0
          ? [...cohort.session_dates_times_array]
              .sort(
                (a, b) =>
                  new Date(a.starts_at).getTime() -
                  new Date(b.starts_at).getTime(),
              )
              .map((s) => ({
                startIso: s.starts_at,
                duration: s.duration_minutes ?? fallbackDuration,
              }))
          : (o.snapshot_session_titles ?? []).map((s) => ({
              startIso: s.scheduled_time,
              duration: fallbackDuration,
            }));

      const total = unified.length;
      unified.forEach((s, idx) => {
        out.push({
          orderId: o.id,
          sessionNumber: idx + 1,
          totalSessions: total,
          courseTitle: `${title} — Session ${idx + 1} of ${total}`,
          instructorName: o.counterparty_name,
          startIso: s.startIso,
          durationMinutes: s.duration,
          orderStatus: o.status,
          journeyId: o.journey_id ?? null,
        });
      });
    });
    return out;
  }, [orderList, cohortQueries.map((q) => q.dataUpdatedAt).join("|")]);

  const enrolled = useMemo(() => {
    return rows
      .filter(
        (r) =>
          r.orderStatus !== "completed" &&
          !fullyDoneOrderIds.has(r.orderId) &&
          !completedSet.has(`${r.orderId}:${r.sessionNumber}`),
      )
      .sort(
        (a, b) =>
          new Date(a.startIso).getTime() - new Date(b.startIso).getTime(),
      );
  }, [rows, completedSet, fullyDoneOrderIds]);

  const completed = useMemo(() => {
    return rows
      .filter(
        (r) =>
          r.orderStatus === "completed" ||
          fullyDoneOrderIds.has(r.orderId) ||
          completedSet.has(`${r.orderId}:${r.sessionNumber}`),
      )
      .sort(
        (a, b) =>
          new Date(b.startIso).getTime() - new Date(a.startIso).getTime(),
      );
  }, [rows, completedSet, fullyDoneOrderIds]);

  function launchClassroom(orderId: string) {
    navigate({ to: "/classroom/$orderId", params: { orderId } });
  }

  if (!user) return null;

  const cohortsLoading = cohortQueries.some((q) => q.isLoading);
  const loading = isLoading || cohortsLoading;

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight" style={display}>
        My Schedule
      </h1>
      <p className="mt-2 text-muted-foreground">
        Every session you've enrolled in — flattened into a clean chronological timeline.
      </p>

      <RescheduleProposalsSection />



      <Tabs defaultValue="enrolled" className="mt-6">
        <TabsList>
          <TabsTrigger value="enrolled">
            Enrolled {enrolled.length > 0 && `(${enrolled.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {completed.length > 0 && `(${completed.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="mt-4">
          <ScheduleTable
            rows={enrolled}
            loading={loading}
            mode="enrolled"
            onLaunch={launchClassroom}
            reviewedSet={reviewedSet}
            fullyDoneOrderIds={fullyDoneOrderIds}
          />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <ScheduleTable
            rows={completed}
            loading={loading}
            mode="completed"
            onLaunch={launchClassroom}
            reviewedSet={reviewedSet}
            fullyDoneOrderIds={fullyDoneOrderIds}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ScheduleTable({
  rows,
  loading,
  mode,
  onLaunch,
  reviewedSet,
  fullyDoneOrderIds,
}: {
  rows: SessionRow[];
  loading: boolean;
  mode: "enrolled" | "completed";
  onLaunch: (orderId: string) => void;
  reviewedSet: Set<string>;
  fullyDoneOrderIds: Set<string>;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Session Time</TableHead>
            <TableHead className="font-bold">Fishing Trip Title</TableHead>
            <TableHead className="font-bold">Instructor</TableHead>
            <TableHead className="font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                Loading…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                {mode === "enrolled"
                  ? "No upcoming sessions."
                  : "No completed sessions yet."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <ScheduleRow
                key={`${r.orderId}-${r.sessionNumber}`}
                row={r}
                mode={mode}
                onLaunch={() => onLaunch(r.orderId)}
                alreadyReviewed={reviewedSet.has(r.orderId)}
                courseFullyDone={fullyDoneOrderIds.has(r.orderId)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ScheduleRow({
  row,
  mode,
  onLaunch,
  alreadyReviewed,
  courseFullyDone,
}: {
  row: SessionRow;
  mode: "enrolled" | "completed";
  onLaunch: () => void;
  alreadyReviewed: boolean;
  courseFullyDone: boolean;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [openingThread, setOpeningThread] = useState(false);
  const isFinal = row.sessionNumber === row.totalSessions;
  const isCourseComplete = row.orderStatus === "completed" || courseFullyDone;
  const timeText = fmtSessionTime(row.startIso);
  const endIso = new Date(
    new Date(row.startIso).getTime() + row.durationMinutes * 60_000,
  ).toISOString();
  const calendarUrl = buildGoogleCalendarUrl({
    title: row.courseTitle,
    details: `Instructor: ${row.instructorName}`,
    startIso: row.startIso,
    endIso,
  });
  const navigate = useNavigate();
  const ensureThreadFn = useServerFn(ensureThreadForJourney);
  const firstName = (row.instructorName || "").trim().split(/\s+/)[0] || "Instructor";

  async function openThread() {
    if (!row.journeyId || openingThread) return;
    setOpeningThread(true);
    try {
      const { thread_id } = await ensureThreadFn({
        data: { journey_id: row.journeyId },
      });
      navigate({
        to: "/dashboard/messages/$threadId",
        params: { threadId: thread_id },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open conversation.");
    } finally {
      setOpeningThread(false);
    }
  }


  return (
    <TableRow>
      <TableCell className="text-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-foreground whitespace-nowrap">{timeText}</span>
          {mode === "enrolled" && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Add to Google Calendar"
              aria-label="Add to Google Calendar"
              className="inline-flex size-7 items-center justify-center rounded-md text-blue-600 hover:bg-accent hover:text-blue-700"
            >
              <CalendarPlus className="size-4" />
            </a>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground">
        {row.courseTitle}
      </TableCell>
      <TableCell className="text-sm text-foreground">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{row.instructorName}</span>
          {row.journeyId && (
            <button
              type="button"
              onClick={openThread}
              disabled={openingThread}
              title={`Message ${firstName}`}
              aria-label={`Message ${row.instructorName}`}
              className="inline-flex size-7 items-center justify-center rounded-md text-blue-600 hover:bg-accent hover:text-blue-700 disabled:opacity-60"
            >
              {openingThread ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
            </button>
          )}
        </div>
      </TableCell>
      <TableCell>
        {mode === "enrolled" ? (
          <Button size="sm" onClick={onLaunch}>
            Join Trip room
          </Button>
        ) : isFinal && isCourseComplete ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                window.open(`/certificate/${row.orderId}`, "_blank")
              }
            >
              <Award className="mr-1 size-4" /> Print Certificate
            </Button>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => !alreadyReviewed && setReviewOpen(true)}
                    disabled={alreadyReviewed}
                    aria-label={
                      alreadyReviewed ? "Review Submitted" : "Write Review"
                    }
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-md border border-border transition-colors",
                      alreadyReviewed
                        ? "cursor-not-allowed text-muted-foreground/50"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <Star
                      className={cn(
                        "size-4",
                        alreadyReviewed && "fill-muted-foreground/30",
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {alreadyReviewed ? "Review Submitted" : "Write Review"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!alreadyReviewed && (
              <WriteReviewDialog
                open={reviewOpen}
                onOpenChange={setReviewOpen}
                orderId={row.orderId}
                courseTitle={row.courseTitle}
              />
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Attended</span>
        )}
      </TableCell>
    </TableRow>
  );
}
