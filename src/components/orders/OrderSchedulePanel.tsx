import { CalendarPlus, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildGoogleCalendarUrl } from "@/lib/calendar-links";
import type { OrderSummary } from "@/lib/orders.functions";
import { useProfileStore } from "@/stores/useProfileStore";
import { resolveViewerTimezone } from "@/lib/tz";
import { DualZoneTime } from "@/components/chat/DualZoneTime";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

interface UnifiedSession {
  session_number: number;
  title: string;
  scheduled_time: string;
  duration_minutes: number;
}

export function OrderSchedulePanel({
  order,
  onMarkComplete,
}: {
  order: OrderSummary;
  onMarkComplete?: () => void;
}) {
  const profileTz = useProfileStore((s) => s.timezone);
  const viewerTz = resolveViewerTimezone(profileTz);
  const otherTz = order.mentor_timezone ?? null;
  const otherLabel = order.viewer_role === "aide" ? "Learner's time" : "Aide's time";

  const fallbackDuration = order.snapshot_session_duration ?? 60;
  const courseTitle = order.snapshot_course_title ?? "Trip session";

  const sessions: UnifiedSession[] = (order.snapshot_session_titles ?? []).map((s) => ({
    session_number: s.session_number,
    title: s.title,
    scheduled_time: s.scheduled_time,
    duration_minutes: fallbackDuration,
  }));

  const finalSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const isCompleted = order.status === "completed";
  const finalSessionPast =
    !!finalSession && new Date(finalSession.scheduled_time) <= new Date();
  const showMarkComplete =
    !!onMarkComplete && !isCompleted && finalSessionPast;

  function buildUrlFor(s: UnifiedSession) {
    const start = new Date(s.scheduled_time);
    const end = new Date(start.getTime() + s.duration_minutes * 60 * 1000);
    return buildGoogleCalendarUrl({
      title: `${courseTitle} — ${s.title}`,
      details: `Session with ${order.counterparty_name} (Order ${order.order_number})`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
  }

  function syncAll() {
    const future = sessions.filter(
      (s) => new Date(s.scheduled_time) > new Date(),
    );
    if (future.length === 0) {
      toast.info("No future sessions to sync.");
      return;
    }
    toast(
      `Opening ${future.length} calendar tab${future.length === 1 ? "" : "s"} — approve any popup blocker prompt.`,
    );
    future.forEach((s, i) => {
      setTimeout(() => {
        window.open(buildUrlFor(s), "_blank", "noopener,noreferrer");
      }, i * 250);
    });
  }

  if (sessions.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground">
        No session schedule available.
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-semibold" style={display}>
          {courseTitle} — full schedule ({sessions.length})
        </div>
        <Button size="sm" onClick={syncAll}>
          📅 Sync Entire Schedule
        </Button>
      </div>
      <div className="max-h-[280px] overflow-y-auto rounded border border-border bg-background">
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const future = new Date(s.scheduled_time) > new Date();
            const isFinal = finalSession?.session_number === s.session_number;
            return (
              <li
                key={s.session_number}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                  {s.session_number}
                </span>
                <span className="flex-1 truncate font-medium">{s.title}</span>
                <div className="shrink-0">
                  <DualZoneTime
                    utcIso={s.scheduled_time}
                    viewerTz={viewerTz}
                    otherTz={otherTz}
                    viewerLabel="Your time"
                    otherLabel={otherLabel}
                    compact
                  />
                </div>
                {future ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    title="Add this session to Google Calendar"
                    onClick={() =>
                      window.open(
                        buildUrlFor(s),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <CalendarPlus className="size-4" />
                  </Button>
                ) : isFinal && showMarkComplete ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 shrink-0 px-2"
                    onClick={onMarkComplete}
                    title="Mark this trip complete"
                  >
                    <Flag className="mr-1 size-3" /> 🏁 Mark Complete
                  </Button>
                ) : (
                  <span className="inline-block w-[112px] shrink-0" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
