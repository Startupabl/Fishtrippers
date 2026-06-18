import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearnerPrefsStore } from "@/stores/useLearnerPrefsStore";
import {
  getMatches,
  safetyBadges,
  GOAL_LABELS,
  DEVICE_LABELS,
  PACE_LABELS,
} from "@/lib/learner-match";
import { displayMentorName } from "@/lib/mentor-display";

export const Route = createFileRoute("/onboarding/learner/results")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { goal, device, pace } = useLearnerPrefsStore.getState();
    if (!goal) throw redirect({ to: "/onboarding/learner" });
    if (!device) throw redirect({ to: "/onboarding/learner/device" });
    if (!pace) throw redirect({ to: "/onboarding/learner/pace" });
  },
  head: () => ({
    meta: [
      { title: "Your perfect AI guides — FishTrippers" },
      {
        name: "description",
        content: "Your top 3 Guide matches, hand-picked from your answers.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const prefs = useLearnerPrefsStore();
  const navigate = useNavigate();
  const matches = getMatches(prefs, 3);

  const summary =
    prefs.goal && prefs.device && prefs.pace
      ? `for ${GOAL_LABELS[prefs.goal]} on ${DEVICE_LABELS[prefs.device]}, ${PACE_LABELS[prefs.pace]}.`
      : "";

  function handleBrowseAll() {
    prefs.reset();
    navigate({ to: "/search" });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1 text-xs font-medium text-info">
          <Sparkles className="size-3.5" />
          Personalized for you
        </span>
        <h1
          className="mt-4 text-3xl text-foreground md:text-4xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          We found your perfect AI guides!
        </h1>
        {summary && (
          <p className="mt-2 text-base text-muted-foreground">{summary}</p>
        )}
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {matches.map((m) => {
          const badges = safetyBadges(m, prefs);
          return (
            <li key={m.slug}>
              <Link
                to="/m/$mentorSlug"
                params={{ mentorSlug: m.slug }}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-info hover:shadow"
              >
                <img
                  src={m.avatarUrl}
                  alt={displayMentorName(m.name)}
                  className="size-20 rounded-full object-cover"
                />
                <p
                  className="mt-4 text-lg text-foreground"
                  style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
                >
                  {displayMentorName(m.name)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{m.tagline}</p>
                {badges.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                      <li
                        key={b}
                        className="inline-flex items-center rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="info" size="lg">
          <Link to="/search">See My Recommended Aides</Link>
        </Button>
        <Button variant="ghost" size="lg" onClick={handleBrowseAll}>
          Browse All Aides
        </Button>
      </div>
    </main>
  );
}
