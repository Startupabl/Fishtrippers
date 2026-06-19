import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck, X } from "lucide-react";
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
import { useAuthStore } from "@/stores/useAuthStore";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { ALERTS_CHANGED_EVENT } from "./AlertsBellButton";

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

export function AlertsOnlyBellButton() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchAlertCount = useServerFn(getUnreadAlertCount);
  const fetchAlertList = useServerFn(listMyAlerts);
  const markRead = useServerFn(markAlertRead);
  const markAll = useServerFn(markAllAlertsRead);
  const removeAlert = useServerFn(deleteAlert);

  const [alertsUnread, setAlertsUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserAlertRow[]>([]);

  const refreshCount = useCallback(() => {
    fetchAlertCount({})
      .then((r) => setAlertsUnread(r.count))
      .catch(() => {});
  }, [fetchAlertCount]);

  useEffect(() => {
    if (!user) return;
    refreshCount();
    const id = setInterval(refreshCount, 30_000);
    const onEvt = () => refreshCount();
    window.addEventListener(ALERTS_CHANGED_EVENT, onEvt);
    return () => {
      clearInterval(id);
      window.removeEventListener(ALERTS_CHANGED_EVENT, onEvt);
    };
  }, [user, refreshCount]);

  useEffect(() => {
    if (!open) return;
    fetchAlertList({})
      .then(setItems)
      .catch(() => {});
  }, [open, fetchAlertList]);

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
        ).then(() => refreshCount());
        return [];
      });
    }, 5000);
    return () => {
      if (autoDeleteTimer.current) {
        clearTimeout(autoDeleteTimer.current);
        autoDeleteTimer.current = null;
      }
    };
  }, [open, removeAlert, refreshCount]);

  const handleDeleteAlert = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((a) => a.id !== id));
    try {
      await removeAlert({ data: { id } });
    } finally {
      refreshCount();
    }
  };

  if (!user) return null;
  const label = alertsUnread > 9 ? "9+" : String(alertsUnread);

  const handleAlertClick = async (a: UserAlertRow) => {
    if (!a.read_at) {
      await markRead({ data: { id: a.id } });
      refreshCount();
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

  const handleMarkAll = async () => {
    await markAll({});
    setItems((prev) =>
      prev.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() })),
    );
    refreshCount();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            alertsUnread > 0 ? `Alerts — ${alertsUnread} unread` : "Alerts"
          }
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <Bell className="size-5" />
          {alertsUnread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none ring-2 ring-paper"
              style={{
                height: 18,
                backgroundColor: DESIGN_SYSTEM.colors.sunnyYellow,
                color: "#0A2540",
              }}
            >
              {label}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-sm font-semibold">Alerts</span>
          {items.some((a) => !a.read_at) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleMarkAll}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
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
      </PopoverContent>
    </Popover>
  );
}
