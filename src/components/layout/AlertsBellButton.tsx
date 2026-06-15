import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, CheckCheck, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  deleteAlert,
  getUnreadAlertCount,
  listMyAlerts,
  markAlertRead,
  markAllAlertsRead,
  type UserAlertRow,
} from "@/lib/alerts.functions";
import {
  getUnreadCount as getUnreadMessageCount,
  listMyThreads,
} from "@/lib/messages.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { DESIGN_SYSTEM } from "@/lib/brand";

export const ALERTS_CHANGED_EVENT = "alerts:changed";
export const MESSAGES_UNREAD_EVENT = "messages:unread-changed";

interface ThreadPreview {
  id: string;
  counterpart_name: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function AlertsBellButton() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchAlertCount = useServerFn(getUnreadAlertCount);
  const fetchAlertList = useServerFn(listMyAlerts);
  const markRead = useServerFn(markAlertRead);
  const markAll = useServerFn(markAllAlertsRead);
  const removeAlert = useServerFn(deleteAlert);
  const fetchMsgCount = useServerFn(getUnreadMessageCount);
  const fetchThreads = useServerFn(listMyThreads);

  const [alertsUnread, setAlertsUnread] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserAlertRow[]>([]);
  const [threads, setThreads] = useState<ThreadPreview[]>([]);

  const refreshCounts = useCallback(() => {
    fetchAlertCount({})
      .then((r) => setAlertsUnread(r.count))
      .catch(() => {});
    fetchMsgCount({})
      .then((r) => setMsgUnread(r.count))
      .catch(() => {});
  }, [fetchAlertCount, fetchMsgCount]);

  useEffect(() => {
    if (!user) return;
    refreshCounts();
    const id = setInterval(refreshCounts, 30_000);
    const onEvt = () => refreshCounts();
    window.addEventListener(ALERTS_CHANGED_EVENT, onEvt);
    window.addEventListener(MESSAGES_UNREAD_EVENT, onEvt);
    return () => {
      clearInterval(id);
      window.removeEventListener(ALERTS_CHANGED_EVENT, onEvt);
      window.removeEventListener(MESSAGES_UNREAD_EVENT, onEvt);
    };
  }, [user, refreshCounts]);

  useEffect(() => {
    if (!open) return;
    fetchAlertList({})
      .then(setItems)
      .catch(() => {});
    fetchThreads({})
      .then((rows) =>
        setThreads(
          rows
            .filter((t) => t.unread_count > 0)
            .slice(0, 5)
            .map((t) => ({
              id: t.id,
              counterpart_name: t.counterpart_name,
              last_message_preview: t.last_message_preview,
              last_message_at: t.last_message_at,
              unread_count: t.unread_count,
            })),
        ),
      )
      .catch(() => {});
  }, [open, fetchAlertList, fetchThreads]);

  // Auto-delete alerts 5 seconds after the popover opens.
  const autoDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) {
      if (autoDeleteTimer.current) {
        clearTimeout(autoDeleteTimer.current);
        autoDeleteTimer.current = null;
      }
      return;
    }
    autoDeleteTimer.current = setTimeout(() => {
      setItems((prev) => {
        if (prev.length === 0) return prev;
        Promise.all(
          prev.map((a) => removeAlert({ data: { id: a.id } }).catch(() => {})),
        ).then(() => refreshCounts());
        return [];
      });
    }, 5000);
    return () => {
      if (autoDeleteTimer.current) {
        clearTimeout(autoDeleteTimer.current);
        autoDeleteTimer.current = null;
      }
    };
  }, [open, removeAlert, refreshCounts]);

  const handleDeleteAlert = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((a) => a.id !== id));
    try {
      await removeAlert({ data: { id } });
    } finally {
      refreshCounts();
    }
  };


  if (!user) return null;
  const totalUnread = alertsUnread + msgUnread;
  const label = totalUnread > 9 ? "9+" : String(totalUnread);

  const handleAlertClick = async (a: UserAlertRow) => {
    if (!a.read_at) {
      await markRead({ data: { id: a.id } });
      refreshCounts();
    }
    setOpen(false);
    if (a.kind === "booking_confirmed") {
      navigate({ to: "/dashboard/upcoming-sessions" });
      return;
    }
    if (a.journey_id) {
      navigate({
        to: "/dashboard/listings/$journeyId/showcase",
        params: { journeyId: a.journey_id },
      });
    }
  };

  const handleThreadClick = (threadId: string) => {
    setOpen(false);
    navigate({
      to: "/dashboard/messages/$threadId",
      params: { threadId },
    });
  };

  const handleMarkAll = async () => {
    await markAll({});
    setItems((prev) =>
      prev.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() })),
    );
    refreshCounts();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            totalUnread > 0 ? `Messages & alerts — ${totalUnread} unread` : "Messages & alerts"
          }
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <MessageCircle className="size-5" />
          {totalUnread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none ring-2 ring-paper"
              style={{
                height: 18,
                backgroundColor: DESIGN_SYSTEM.colors.sunnyYellow,
                color: "#1F6B36",
              }}
            >
              {label}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {items.some((a) => !a.read_at) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleMarkAll}
            >
              <CheckCheck className="size-3.5" /> Mark alerts read
            </Button>
          )}
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {/* Messages */}
          <div>
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Messages
            </div>
            {threads.length === 0 ? (
              <p className="px-3 pb-2 text-center text-xs text-muted-foreground">
                No new messages.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => handleThreadClick(t.id)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/5"
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                        <span className="flex-1 truncate font-medium">
                          {t.counterpart_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(t.last_message_at)}
                        </span>
                      </div>
                      {t.last_message_preview && (
                        <span className="line-clamp-1 pl-4 text-xs text-muted-foreground">
                          {t.last_message_preview}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-b border-border/60 px-3 py-1.5 text-right">
              <Link
                to="/dashboard/messages"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all messages
              </Link>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Alerts
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No alerts yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((a) => (
                  <li key={a.id} className="relative">
                    <button
                      type="button"
                      onClick={() => handleAlertClick(a)}
                      className={`flex w-full flex-col items-start gap-1 px-3 py-2.5 pr-9 text-left text-sm transition-colors hover:bg-foreground/5 ${
                        a.read_at ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex w-full items-start gap-2">
                        {!a.read_at && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className="flex-1">{a.message}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(a.created_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss alert"
                      onClick={(e) => handleDeleteAlert(e, a.id)}
                      className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
