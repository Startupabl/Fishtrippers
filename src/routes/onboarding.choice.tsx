import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { startNewMentorExpressListing } from "@/stores/useMentorExpressStore";
import { supabase } from "@/integrations/supabase/client";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";

export const Route = createFileRoute("/onboarding/choice")({
  head: () => ({
    meta: [
      { title: "Choose your path — FishTrippers" },
      {
        name: "description",
        content: "Tell us how you want to use FishTrippers.",
      },
    ],
  }),
  component: ChoicePage,
});

function ChoicePage() {
  const navigate = useNavigate();
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const { guard, dialog: profileGuardDialog } = useProfileGuard();

  // If session has hydrated but no user is present (stale email link, etc.),
  // route them to login so the flow can't dead-end on Step 1.
  useEffect(() => {
    if (initialized && !user) {
      navigate({ to: "/login" });
    }
  }, [initialized, user, navigate]);

  // Safety net: if a returning user lands here (bookmark, stale email link),
  // and they already have activity in the app, send them home instead.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [orders, journeys] = await Promise.all([
        supabase.from("orders").select("id").eq("learner_id", user.id).limit(1),
        supabase.from("journeys").select("id").eq("mentor_id", user.id).limit(1),
      ]);
      if (cancelled) return;
      if ((orders.data?.length ?? 0) > 0 || (journeys.data?.length ?? 0) > 0) {
        navigate({ to: "/" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const ready = initialized && !!user;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1
        className="text-3xl text-foreground md:text-4xl"
        style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
      >
        How would you like to start?
      </h1>
      <p className="mt-2 text-muted-foreground">
        {ready
          ? "You can change this anytime."
          : "Setting up your account…"}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/"
          onClick={() => {
            try {
              localStorage.setItem("fishtrippers_quiz_open", "1");
            } catch {
              // ignore
            }
          }}
          aria-disabled={!ready}
          className={
            "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-info hover:bg-accent " +
            (ready ? "" : "pointer-events-none opacity-60")
          }
        >

          <Sparkles className="size-6 text-info" />
          <span
            className="text-xl text-foreground"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            I want to learn
          </span>
          <span className="text-sm text-muted-foreground">
            Take the 30-Second Flavor Quiz and meet your perfect Aide.
          </span>
        </Link>

        <Link
          to="/mentor/create-path"
          search={{ new: true }}
          onClick={guard(startNewMentorExpressListing)}
          aria-disabled={!ready}
          className={
            "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-info hover:bg-accent " +
            (ready ? "" : "pointer-events-none opacity-60")
          }
        >
          <GraduationCap className="size-6 text-info" />
          <span
            className="text-xl text-foreground"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            I want to be an Aide
          </span>
          <span className="text-sm text-muted-foreground">
            Introduce yourself once, then publish your first Course.
          </span>
        </Link>
      </div>

      <div className="mt-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">Skip for now</Link>
        </Button>
      </div>
      {profileGuardDialog}
    </main>
  );
}
