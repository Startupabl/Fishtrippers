import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getUnreadCount as getUnreadMessageCount,
  listMyThreads,
} from "@/lib/messages.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { MESSAGES_UNREAD_EVENT } from "./AlertsBellButton";

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

export function MessagesIconButton() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchMsgCount = useServerFn(getUnreadMessageCount);
  const fetchThreads = useServerFn(listMyThreads);

  const [msgUnread, setMsgUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadPreview[]>([]);

  const refreshCount = useCallback(() => {
    fetchMsgCount({})
      .then((r) => setMsgUnread(r.count))
      .catch(() => {});
  }, [fetchMsgCount]);

  useEffect(() => {
    if (!user) return;
    refreshCount();
    const id = setInterval(refreshCount, 30_000);
    const onEvt = () => refreshCount();
    window.addEventListener(MESSAGES_UNREAD_EVENT, onEvt);
    return () => {
      clearInterval(id);
      window.removeEventListener(MESSAGES_UNREAD_EVENT, onEvt);
    };
  }, [user, refreshCount]);

  useEffect(() => {
    if (!open) return;
    fetchThreads({})
      .then((rows) =>
        setThreads(
          rows
            .filter((t) => t.unread_count > 0)
            .slice(0, 8)
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
  }, [open, fetchThreads]);

  if (!user) return null;
  const label = msgUnread > 9 ? "9+" : String(msgUnread);

  const handleThreadClick = (threadId: string) => {
    setOpen(false);
    navigate({
      to: "/dashboard/messages/$threadId",
      params: { threadId },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            msgUnread > 0 ? `Messages — ${msgUnread} unread` : "Messages"
          }
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <MessageCircle className="size-5" />
          {msgUnread > 0 && (
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
          <span className="text-sm font-semibold">Messages</span>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {threads.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
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
          <div className="border-t border-border/60 px-3 py-1.5 text-right">
            <Link
              to="/dashboard/messages"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all messages
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
