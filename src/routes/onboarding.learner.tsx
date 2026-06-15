import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Briefcase, Palette, Calendar, Compass } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useLearnerPrefsStore } from "@/stores/useLearnerPrefsStore";
import type { LearnerGoal } from "@/data/lesson-paths";

export const Route = createFileRoute("/onboarding/learner")({
  head: () => ({
    meta: [
      { title: "Find your perfect Aide — Lemonaidely" },
      {
        name: "description",
        content:
          "Answer 3 quick questions to get matched with the right AI Aide for your goals.",
      },
    ],
  }),
  component: GoalStep,
});

const OPTIONS: {
  value: LearnerGoal;
  title: string;
  helper: string;
  icon: typeof Briefcase;
}[] = [
  {
    value: "work",
    title: "Work & Productivity",
    helper: "I want to save time at my job.",
    icon: Briefcase,
  },
  {
    value: "creative",
    title: "Creative & Hobbies",
    helper: "I want to make art, write stories, or edit photos.",
    icon: Palette,
  },
  {
    value: "life",
    title: "Life & Organization",
    helper: "I want help with emails, travel planning, or daily tasks.",
    icon: Calendar,
  },
  {
    value: "curiosity",
    title: "Curiosity",
    helper: "I just want to know what all the fuss is about.",
    icon: Compass,
  },
];

function GoalStep() {
  const navigate = useNavigate();
  const goal = useLearnerPrefsStore((s) => s.goal);
  const setGoal = useLearnerPrefsStore((s) => s.setGoal);

  function handleSelect(value: LearnerGoal) {
    setGoal(value);
    navigate({ to: "/onboarding/learner/device" });
  }

  return (
    <OnboardingShell
      step={1}
      headline="What is your main goal for learning AI?"
      subhead="Pick the one that fits best — you can always change it later."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            icon={o.icon}
            title={o.title}
            helper={o.helper}
            selected={goal === o.value}
            onSelect={() => handleSelect(o.value)}
          />
        ))}
      </div>
    </OnboardingShell>
  );
}
