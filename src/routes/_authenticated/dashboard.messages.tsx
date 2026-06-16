import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNowStrict } from "date-fns";
import { Archive, ArchiveRestore, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  listMyThreads,
  setThreadArchived,
  type ThreadSummary,
} from "@/lib/messages.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  head: () => ({ meta: [{ title: "Messages — FishTrippers" }] }),
  component: MessagesLayout,
});

type Filter = "active" | "archived";

function MessagesLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const fetchThreads = useServerFn(listMyThreads);
  const toggleArchived = useServerFn(setThreadArchived);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [exiting, setExiting] = useState<Record<string, boolean>>({});

  const threadMatch = matchRoute({
    to: "/dashboard/messages/$threadId",
    fuzzy: false,
  });
  const activeThreadId =
    threadMatch && typeof threadMatch === "object"
      ? (threadMatch as { threadId?: string }).threadId
      : undefined;
  const hasActiveThread = !!activeThreadId;

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    const load = () => {
      fetchThreads({ data: { filter } })
        .then((rows) => {
          if (!cancelled) setThreads(rows);
        })
        .catch(() => {
          if (!cancelled && threads === null) setThreads([]);
        });
    };
    load();
    const id = setInterval(load, 30000);
    const onEvt = () => load();
    window.addEventListener("messages:unread-changed", onEvt);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("messages:unread-changed", onEvt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fetchThreads, navigate, filter]);

  async function handleArchiveToggle(e: React.MouseEvent, t: ThreadSummary) {
    e.preventDefault();
    e.stopPropagation();
    const nextArchived = !t.is_archived;
    setExiting((m) => ({ ...m, [t.id]: true }));
    try {
      await toggleArchived({ data: { thread_id: t.id, archived: nextArchived } });
      // Animate out then remove
      setTimeout(() => {
        setThreads((prev) => (prev ?? []).filter((x) => x.id !== t.id));
        setExiting((m) => {
          const { [t.id]: _gone, ...rest } = m;
          return rest;
        });
      }, 250);
    } catch (err) {
      setExiting((m) => {
        const { [t.id]: _gone, ...rest } = m;
        return rest;
      });
      toast.error(err instanceof Error ? err.message : "Could not update.");
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] min-w-0 w-full max-w-[1400px] overflow-x-hidden">
      <aside
        className={cn(
          "min-w-0 max-w-full flex-col overflow-x-hidden border-r border-border bg-paper",
          "w-full md:w-[35%] md:max-w-[420px]",
          hasActiveThread ? "hidden md:flex" : "flex",
        )}
      >
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-xl font-semibold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground">
            Conversations with your Aides and learners.
          </p>
          <div className="mt-3 inline-flex rounded-full border border-border bg-muted/40 p-0.5 text-xs font-semibold">
            {(["active", "archived"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1 capitalize transition-colors",
                  filter === f
                    ? "bg-paper text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads === null && (
            <p className="p-5 text-sm text-muted-foreground">Loading…</p>
          )}
          {threads !== null && threads.length === 0 && (
            <div className="m-4 rounded-2xl border border-border bg-card p-6 text-center">
              <MessageCircle className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {filter === "archived"
                  ? "No archived conversations."
                  : "No conversations yet. Inquire on a Course to get started."}
              </p>
            </div>
          )}
          <ul className="divide-y divide-border">
            {threads?.map((t) => {
              const isActive = t.id === activeThreadId;
              const unread = t.unread_count > 0;
              const isExiting = !!exiting[t.id];
              return (
                <li
                  key={t.id}
                  className={cn(
                    "group relative overflow-hidden transition-all duration-200",
                    isExiting && "max-h-0 opacity-0",
                  )}
                  style={!isExiting ? { maxHeight: "120px" } : undefined}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1"
                    style={{
                      backgroundColor: unread ? "#F5C518" : "transparent",
                    }}
                  />
                  <Link
                    to="/dashboard/messages/$threadId"
                    params={{ threadId: t.id }}
                    className={cn(
                      "flex items-start gap-3 py-4 pl-5 pr-4 transition-colors hover:bg-muted/40",
                      isActive && "bg-muted/50",
                    )}
                  >
                    <img
                      src={
                        t.counterpart_avatar_url ??
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.counterpart_name)}`
                      }
                      alt={t.counterpart_name}
                      className="size-12 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-foreground",
                            unread ? "font-bold" : "font-semibold",
                          )}
                        >
                          {t.counterpart_name}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDistanceToNowStrict(
                            new Date(t.last_message_at),
                            { addSuffix: false },
                          )}
                        </span>
                      </div>
                      {t.journey_title && (
                        <p className="truncate text-xs text-muted-foreground">
                          {t.journey_title}
                        </p>
                      )}
                      <p
                        className={cn(
                          "mt-1 flex items-center gap-1.5 truncate text-sm",
                          unread
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {t.last_message_is_urgent && (
                          <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Urgent
                          </span>
                        )}
                        <span className="truncate">
                          {t.last_message_preview ?? "No messages yet"}
                        </span>
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => handleArchiveToggle(e, t)}
                    aria-label={t.is_archived ? "Unarchive conversation" : "Archive conversation"}
                    className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-paper/95 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                  >
                    {t.is_archived ? (
                      <ArchiveRestore className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <section
        className={cn(
          "min-w-0 max-w-full flex-1 flex-col overflow-x-hidden bg-background",
          hasActiveThread ? "flex" : "hidden md:flex",
        )}
      >
        <Outlet />
      </section>
    </div>
  );
}
