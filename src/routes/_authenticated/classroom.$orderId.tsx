import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, Hourglass, LogOut } from "lucide-react";
import {
  startClassSession,
  endClassSession,
} from "@/lib/bookings.functions";
import { getDailyJoinInfo } from "@/lib/classroom.functions";
import { DailyEmbed } from "@/components/classroom/DailyEmbed";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export const Route = createFileRoute("/_authenticated/classroom/$orderId")({
  head: () => ({ meta: [{ title: "Live Classroom — Lemonaidely" }] }),
  component: ClassroomPage,
});

function ClassroomPage() {
  const { orderId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const fetchInfo = useServerFn(getDailyJoinInfo);
  const startFn = useServerFn(startClassSession);
  const endFn = useServerFn(endClassSession);

  const infoKey = ["classroom-join-info", orderId];

  const { data: info, isLoading, isError } = useQuery({
    queryKey: infoKey,
    queryFn: () => fetchInfo({ data: { order_id: orderId } }),
    retry: false,
    refetchInterval: (q) => {
      // Learner fallback poll while waiting; stop once live
      const d = q.state.data as Awaited<ReturnType<typeof fetchInfo>> | undefined;
      if (!d) return false;
      if (d.role === "learner" && !d.is_live) return 15_000;
      return false;
    },
  });

  // Realtime: Learner subscribes to class_sessions UPDATE on its class_session_id.
  useEffect(() => {
    if (!info || info.role !== "learner") return;
    const channel = supabase
      .channel(`class-session-${info.class_session_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "class_sessions",
          filter: `id=eq.${info.class_session_id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: infoKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.class_session_id, info?.role]);

  const startMut = useMutation({
    mutationFn: () =>
      startFn({ data: { class_session_id: info!.class_session_id } }),
    // Re-fetch so a fresh aide owner token is minted on entry.
    onSuccess: () => qc.invalidateQueries({ queryKey: infoKey }),
  });

  const endMut = useMutation({
    mutationFn: () =>
      endFn({ data: { class_session_id: info!.class_session_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: infoKey }),
  });

  const [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    if (info?.is_live) setEmbedded(true);
  }, [info?.is_live]);

  const displayName =
    user?.displayName ||
    user?.firstName ||
    user?.email?.split("@")[0] ||
    info?.user_name ||
    "Guest";

  if (isLoading) {
    return (
      <Centered>
        <p className="text-sm text-neutral-400">Loading classroom…</p>
      </Centered>
    );
  }

  if (isError) {
    return (
      <Centered>
        <h1 className="text-xl font-semibold">Could not start classroom session.</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          Something went wrong on our side. Please try again, or contact support
          if this keeps happening.
        </p>
        <div className="mt-6">
          <Button
            onClick={() => qc.invalidateQueries({ queryKey: infoKey })}
          >
            Retry
          </Button>
        </div>
        <BackButtons router={router} />
      </Centered>
    );
  }

  if (!info) {
    return (
      <Centered>
        <p className="text-sm text-neutral-400">
          This order isn't linked to a live classroom yet.
        </p>
        <BackButtons router={router} />
      </Centered>
    );
  }

  // --- Live & embedded -----------------------------------------------------
  if (embedded && info.is_live) {
    return (
      <main className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
        <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {info.listing_title}
            </h1>
            <p className="text-[11px] text-neutral-500">
              {info.role === "aide" ? "You are the moderator" : "Live"}
            </p>
          </div>
          <div className="flex gap-2">
            {info.role === "aide" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  endMut.mutate(undefined, {
                    onSuccess: () => setEmbedded(false),
                  });
                }}
                disabled={endMut.isPending}
              >
                <LogOut className="mr-1 size-4" />
                End Class
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEmbedded(false)}
              >
                Leave
              </Button>
            )}
          </div>
        </header>
        <div className="flex-1 p-2">
          <DailyEmbed
            roomUrl={info.room_url}
            userName={displayName}
            onLeave={() => setEmbedded(false)}
          />
        </div>
      </main>
    );
  }

  // --- Aide pre-launch -----------------------------------------------------
  if (info.role === "aide") {
    return (
      <Centered>
        <h1
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
        >
          {info.listing_title}
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          When you're ready, launch the classroom. Your learners will be let in
          automatically.
        </p>
        <Button
          size="lg"
          className="mt-6 rounded-2xl"
          onClick={() => startMut.mutate()}
          disabled={startMut.isPending}
        >
          <Rocket className="mr-2 size-4" />
          {startMut.isPending ? "Starting…" : "Launch Classroom"}
        </Button>
        <BackButtons router={router} />
      </Centered>
    );
  }

  // --- Learner waiting screen ---------------------------------------------
  return (
    <Centered>
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-yellow-400/10 ring-1 ring-yellow-400/30">
        <Hourglass className="size-8 animate-pulse text-yellow-400" />
      </div>
      <h1
        className="mt-6 text-2xl font-bold tracking-tight md:text-3xl"
        style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
      >
        Your teacher hasn't arrived yet
      </h1>
      <p className="mt-3 max-w-md text-sm text-neutral-400">
        Hang tight — this page will automatically refresh the moment class
        starts.
      </p>
      <p className="mt-6 text-xs text-neutral-600">
        Course: {info.listing_title}
      </p>
      <BackButtons router={router} />
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-neutral-950 px-6 py-12 text-center text-neutral-100">
      {children}
    </main>
  );
}

function BackButtons({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="mt-8 flex gap-3">
      <Button
        variant="secondary"
        onClick={() => {
          if (window.history.length > 1) router.history.back();
          else router.navigate({ to: "/dashboard" });
        }}
      >
        <ArrowLeft className="mr-1 size-4" /> Back
      </Button>
      <Button asChild variant="outline">
        <Link to="/my-learning">My Learning</Link>
      </Button>
    </div>
  );
}
