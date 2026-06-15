import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Turtle, Zap, Sparkles } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useLearnerPrefsStore } from "@/stores/useLearnerPrefsStore";
import type { LearnerPace } from "@/data/lesson-paths";

export const Route = createFileRoute("/onboarding/learner/pace")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { goal, device } = useLearnerPrefsStore.getState();
    if (!goal) throw redirect({ to: "/onboarding/learner" });
    if (!device) throw redirect({ to: "/onboarding/learner/device" });
  },
  head: () => ({
    meta: [
      { title: "Your learning style — Lemonaidely" },
      {
        name: "description",
        content:
          "How do you like to learn? Pick a vibe and we'll match the right Aide.",
      },
    ],
  }),
  component: PaceStep,
});

const OPTIONS: {
  value: LearnerPace;
  title: string;
  helper: string;
  icon: typeof Turtle;
}[] = [
  {
    value: "slow",
    title: "Slow & Steady",
    helper: "Explain the 'why' behind every click.",
    icon: Turtle,
  },
  {
    value: "fast",
    title: "Fast & Focused",
    helper: "Just show me how to get the result.",
    icon: Zap,
  },
  {
    value: "playful",
    title: "Playful & Experimental",
    helper: "Let's try things and see what happens.",
    icon: Sparkles,
  },
];

function PaceStep() {
  const navigate = useNavigate();
  const pace = useLearnerPrefsStore((s) => s.pace);
  const setPace = useLearnerPrefsStore((s) => s.setPace);

  function handleSelect(value: LearnerPace) {
    setPace(value);
    navigate({ to: "/onboarding/learner/results" });
  }

  return (
    <OnboardingShell
      step={3}
      headline="How do you like to learn?"
      subhead="There's no wrong answer — this just helps us pick a great fit."
      backTo="/onboarding/learner/device"
    >
      <div className="grid grid-cols-1 gap-3">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            icon={o.icon}
            title={o.title}
            helper={o.helper}
            selected={pace === o.value}
            onSelect={() => handleSelect(o.value)}
          />
        ))}
      </div>
    </OnboardingShell>
  );
}
