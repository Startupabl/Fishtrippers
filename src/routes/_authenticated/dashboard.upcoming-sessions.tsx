import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, MessageCircle, Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  listAideScheduleRows,
  editUnbookedSlot,
  deleteUnbookedSlot,
  deleteEntireSession,
  requestReschedule,
  cancelReschedule,
  type ScheduleRow,
} from "@/lib/schedule.functions";
import {
  listSessionCompletions,
  markSessionComplete,
  markOrderComplete,
} from "@/lib/orders.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buildGoogleCalendarUrl } from "@/lib/calendar-links";
import { ensureThreadForAideWithLearner } from "@/lib/messages.functions";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };
const DURATIONS = [30, 45, 60, 90, 120] as const;

export const Route = createFileRoute(
  "/_authenticated/dashboard/upcoming-sessions",
)({
  head: () => ({ meta: [{ title: "My Schedule — FishTrippers" }] }),
  component: UpcomingSessionsPage,
});

function fmtSessionTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })} — ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(v: string): string {
  return new Date(v).toISOString();
}

function UpcomingSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRows = useServerFn(listAideScheduleRows);
  const editFn = useServerFn(editUnbookedSlot);
  const deleteFn = useServerFn(deleteUnbookedSlot);
  const deleteEntireFn = useServerFn(deleteEntireSession);
  const requestFn = useServerFn(requestReschedule);
  const cancelFn = useServerFn(cancelReschedule);
  const listCompletionsFn = useServerFn(listSessionCompletions);
  const markCompleteFn = useServerFn(markSessionComplete);
  const markOrderCompleteFn = useServerFn(markOrderComplete);


  const [editTarget, setEditTarget] = useState<ScheduleRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRow | null>(null);

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["aide-schedule-rows", user?.id],
    queryFn: () => fetchRows(),
    enabled: !!user,
  });

  const allRows = rows ?? [];

  const orderIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      for (const s of r.students) {
        if (s.orderId) set.add(s.orderId);
      }
    }
    return Array.from(set);
  }, [allRows]);

  const { data: completions } = useQuery({
    queryKey: ["aide-session-completions", user?.id, orderIds.sort().join(",")],
    queryFn: () => listCompletionsFn({ data: { order_ids: orderIds } }),
    enabled: !!user && orderIds.length > 0,
  });

  const completedSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of completions ?? []) {
      set.add(`${c.order_id}:${c.session_index}`);
    }
    return set;
  }, [completions]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["aide-schedule-rows"] }),
      queryClient.invalidateQueries({ queryKey: ["aide-session-completions"] }),
    ]);
  };

  async function handleMarkComplete(row: ScheduleRow) {
    const sessionIndex = row.slotIndex + 1;
    const isFinal = sessionIndex === row.sessionSlotCount;
    const targets = row.students.filter(
      (s) => s.orderId && !completedSet.has(`${s.orderId}:${sessionIndex}`),
    );
    if (targets.length === 0) {
      toast.info("Already marked complete.");
      return;
    }
    try {
      for (const s of targets) {
        await markCompleteFn({
          data: { order_id: s.orderId!, session_index: sessionIndex },
        });
        if (isFinal) {
          await markOrderCompleteFn({ data: { order_id: s.orderId! } });
        }
      }
      toast.success(
        isFinal
          ? "Course completed — certificate issued."
          : "Session marked complete.",
      );
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark complete.");
    }
  }


  async function handleDelete() {
    if (!deleteTarget) return;
    const isMulti = deleteTarget.sessionSlotCount > 1;
    try {
      if (isMulti) {
        await deleteEntireFn({
          data: { class_session_id: deleteTarget.classSessionId },
        });
        toast.success("Course removed.");
      } else {
        await deleteFn({
          data: {
            class_session_id: deleteTarget.classSessionId,
            slot_index: deleteTarget.slotIndex,
          },
        });
        toast.success("Session deleted.");
      }
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  async function handleCancelReschedule(row: ScheduleRow) {
    try {
      await cancelFn({
        data: {
          class_session_id: row.classSessionId,
          slot_index: row.slotIndex,
        },
      });
      toast.success("Reschedule request canceled.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel.");
    }
  }

  if (!user) return null;

  const { upcomingRows, completedRows } = (() => {
    const up: ScheduleRow[] = [];
    const done: ScheduleRow[] = [];
    for (const r of allRows) {
      const sessionIndex = r.slotIndex + 1;
      const orderIds = r.students.map((s) => s.orderId).filter((id): id is string => !!id);
      const allDone =
        orderIds.length > 0 &&
        orderIds.every((id) => completedSet.has(`${id}:${sessionIndex}`));
      if (allDone) done.push(r);
      else up.push(r);
    }
    return { upcomingRows: up, completedRows: done };
  })();

  const renderTable = (
    data: ScheduleRow[],
    emptyText: string,
    mode: "upcoming" | "completed",
  ) => (
    <div className="mt-4 w-full overflow-x-auto rounded-md border border-border">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Trip Time</TableHead>
            <TableHead className="font-bold">Total Hours</TableHead>
            <TableHead className="font-bold">Trip Title</TableHead>
            <TableHead className="font-bold">Status</TableHead>
            <TableHead className="font-bold">Seats</TableHead>
            <TableHead className="font-bold">Client(s)</TableHead>
            <TableHead className="font-bold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                Loading…
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            data.map((r) => (
              <ScheduleTableRow
                key={r.key}
                row={r}
                mode={mode}
                completedSet={completedSet}
                onEdit={() => setEditTarget(r)}
                onDelete={() => setDeleteTarget(r)}
                onReschedule={() => setRescheduleTarget(r)}
                onCancelReschedule={() => handleCancelReschedule(r)}
                onMarkComplete={() => handleMarkComplete(r)}
              />
            ))
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
            Upcoming {upcomingRows.length > 0 && `(${upcomingRows.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed {completedRows.length > 0 && `(${completedRows.length})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {renderTable(
            upcomingRows,
            "No sessions yet. Schedule a live course or send a custom offer.",
            "upcoming",
          )}
        </TabsContent>
        <TabsContent value="completed">
          {renderTable(completedRows, "No completed sessions yet.", "completed")}
        </TabsContent>
      </Tabs>

      {editTarget && (

        <EditSlotDialog
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (startsAt, duration) => {
            try {
              await editFn({
                data: {
                  class_session_id: editTarget.classSessionId,
                  slot_index: editTarget.slotIndex,
                  starts_at: startsAt,
                  duration_minutes: duration,
                },
              });
              toast.success("Slot updated.");
              setEditTarget(null);
              await refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save.");
            }
          }}
        />
      )}

      {rescheduleTarget && (
        <RescheduleDialog
          row={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSubmit={async (startsAt, duration) => {
            try {
              const res = await requestFn({
                data: {
                  class_session_id: rescheduleTarget.classSessionId,
                  slot_index: rescheduleTarget.slotIndex,
                  proposed_starts_at: startsAt,
                  proposed_duration_minutes: duration,
                },
              });
              toast.success(
                `Reschedule request sent to ${res.notified} learner${res.notified === 1 ? "" : "s"}.`,
              );
              setRescheduleTarget(null);
              await refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not send request.");
            }
          }}
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.sessionSlotCount > 1
                ? "Remove this multi-session course?"
                : "Delete this session?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.sessionSlotCount > 1
                ? "This session is part of a complete multi-session course package. Deleting it will remove the entire scheduled course and all of its associated sessions from the platform. Do you wish to proceed?"
                : "This slot will be removed from your schedule. If no learner has booked yet, the listing or offer will no longer be available at this time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }}>
              {deleteTarget && deleteTarget.sessionSlotCount > 1 ? "Remove course" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function StatusBadge({ status }: { status: ScheduleRow["status"] | "complete" }) {
  if (status === "unbooked")
    return <Badge variant="secondary">unbooked</Badge>;
  if (status === "booked")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">booked</Badge>;
  if (status === "complete")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">complete</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Pending Reschedule</Badge>;
}

function formatHours(minutes: number): string {
  const h = minutes / 60;
  const rounded = Math.round(h * 100) / 100;
  return `${rounded}h`;
}

function ScheduleTableRow({
  row,
  mode,
  completedSet,
  onEdit,
  onDelete,
  onReschedule,
  onCancelReschedule,
  onMarkComplete,
}: {
  row: ScheduleRow;
  mode: "upcoming" | "completed";
  completedSet: Set<string>;
  onEdit: () => void;
  onDelete: () => void;
  onReschedule: () => void;
  onCancelReschedule: () => void;
  onMarkComplete: () => void;
}) {
  const navigate = useNavigate();
  const endIso = new Date(
    new Date(row.startIso).getTime() + row.durationMinutes * 60_000,
  ).toISOString();
  const calendarUrl = buildGoogleCalendarUrl({
    title: row.listingTitle,
    details:
      row.students.length > 0
        ? `Students: ${row.students.map((s) => s.name).join(", ")}`
        : "Unbooked slot",
    startIso: row.startIso,
    endIso,
  });
  const studentCount = row.students.length;
  const joinOrderId = row.students.find((s) => s.orderId)?.orderId ?? null;
  const sessionIndex = row.slotIndex + 1;
  const studentOrderIds = row.students
    .map((s) => s.orderId)
    .filter((id): id is string => !!id);
  const allCompleted =
    studentOrderIds.length > 0 &&
    studentOrderIds.every((id) => completedSet.has(`${id}:${sessionIndex}`));
  const onJoin = () => {
    if (joinOrderId) {
      navigate({ to: "/classroom/$orderId", params: { orderId: joinOrderId } });
    }
  };


  return (
    <TableRow>
      <TableCell className="text-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-foreground whitespace-nowrap">
            {fmtSessionTime(row.startIso)}
          </span>
          {mode === "upcoming" && (
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
        {row.pendingReschedule && (
          <div className="mt-1 text-xs text-amber-600">
            Proposed → {fmtSessionTime(row.pendingReschedule.proposed_starts_at)} ({row.pendingReschedule.proposed_duration_minutes} min)
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm font-mono text-foreground whitespace-nowrap">
        {formatHours(row.durationMinutes)}
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground max-w-[220px]">
        <div className="truncate" title={row.listingTitle}>{row.listingTitle}</div>
      </TableCell>
      <TableCell>
        <StatusBadge status={mode === "completed" ? "complete" : row.status} />
      </TableCell>
      <TableCell className="text-sm font-mono text-foreground whitespace-nowrap">
        {row.filledSeats}/{row.maxSeats}
      </TableCell>
      <TableCell className="text-sm text-foreground whitespace-nowrap">
        {studentCount === 0 ? (
          "N/A"
        ) : studentCount === 1 ? (
          <StudentNameWithMessage
            student={row.students[0]}
            journeyId={row.courseId}
          />
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs font-medium"
              >
                {studentCount} students ▾
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Enrolled students
              </div>
              <ul className="max-h-64 overflow-y-auto">
                {row.students.map((s) => (
                  <li
                    key={s.id}
                    className="px-2 py-1 text-sm text-foreground"
                  >
                    <StudentNameWithMessage
                      student={s}
                      journeyId={row.courseId}
                    />
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {mode === "completed" ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
            Completed
          </Badge>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {row.status === "unbooked" && (
              <>
                <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={onDelete}>
                  Delete
                </Button>
              </>
            )}
            {(row.status === "booked" || row.status === "pending_reschedule") && (
              <>
                {joinOrderId && (
                  <Button size="sm" onClick={onJoin}>
                    Join Classroom
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      aria-label="More actions"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {row.status === "booked" && (
                      <DropdownMenuItem onSelect={onReschedule}>
                        Reschedule
                      </DropdownMenuItem>
                    )}
                    {row.status === "pending_reschedule" && (
                      <DropdownMenuItem onSelect={onCancelReschedule}>
                        Cancel reschedule request
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={onMarkComplete}
                      disabled={allCompleted || studentOrderIds.length === 0}
                    >
                      {allCompleted ? "Already completed" : "Mark as Complete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </TableCell>

    </TableRow>
  );
}

function EditSlotDialog({
  row,
  onClose,
  onSave,
}: {
  row: ScheduleRow;
  onClose: () => void;
  onSave: (startsAt: string, duration: number) => void;
}) {
  const [start, setStart] = useState(toLocalInputValue(row.startIso));
  const [duration, setDuration] = useState<number>(row.durationMinutes);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Update the start time and duration. Only available while the slot
            is unbooked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Start time</Label>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Session length</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(localInputToIso(start), duration)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  row,
  onClose,
  onSubmit,
}: {
  row: ScheduleRow;
  onClose: () => void;
  onSubmit: (startsAt: string, duration: number) => void;
}) {
  const [start, setStart] = useState(toLocalInputValue(row.startIso));
  const [duration, setDuration] = useState<number>(row.durationMinutes);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a reschedule</DialogTitle>
          <DialogDescription>
            To ensure a smooth reschedule, please confirm the new date/time
            with your learners via message first. Once submitted, we'll send
            your request to them for approval; the current time will remain
            in place until they accept.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded border border-border bg-muted/30 p-3 text-sm">
            <div className="text-muted-foreground">Current time</div>
            <div className="font-medium">
              {fmtSessionTime(row.startIso)} ({row.durationMinutes} min)
            </div>
          </div>
          <div className="space-y-2">
            <Label>Proposed start time</Label>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Session length</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(localInputToIso(start), duration)}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentNameWithMessage({
  student,
  journeyId,
}: {
  student: { id: string; name: string };
  journeyId: string | null;
}) {
  const navigate = useNavigate();
  const ensureThreadFn = useServerFn(ensureThreadForAideWithLearner);
  const [busy, setBusy] = useState(false);
  const firstName = (student.name || "").trim().split(/\s+/)[0] || "learner";

  async function openThread() {
    if (!journeyId || busy) return;
    setBusy(true);
    try {
      const { thread_id } = await ensureThreadFn({
        data: { journey_id: journeyId, learner_id: student.id },
      });
      navigate({
        to: "/dashboard/messages/$threadId",
        params: { threadId: thread_id },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open conversation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{student.name}</span>
      {journeyId && (
        <button
          type="button"
          onClick={openThread}
          disabled={busy}
          title={`Message ${firstName}`}
          aria-label={`Message ${student.name}`}
          className="inline-flex size-7 items-center justify-center rounded-md text-blue-600 hover:bg-accent hover:text-blue-700 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageCircle className="size-4" />
          )}
        </button>
      )}
    </span>
  );
}
