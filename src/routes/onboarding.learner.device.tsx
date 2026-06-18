import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useLearnerPrefsStore } from "@/stores/useLearnerPrefsStore";
import type { LearnerDevice } from "@/data/lesson-paths";

export const Route = createFileRoute("/onboarding/learner/device")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { goal } = useLearnerPrefsStore.getState();
    if (!goal) throw redirect({ to: "/onboarding/learner" });
  },
  head: () => ({
    meta: [
      { title: "Your device — FishTrippers" },
      {
        name: "description",
        content:
          "Tell us which device you'll use so we can match you with an Guide who teaches that way.",
      },
    ],
  }),
  component: DeviceStep,
});

const OPTIONS: {
  value: LearnerDevice;
  title: string;
  helper: string;
  icon: typeof Monitor;
}[] = [
  {
    value: "computer",
    title: "Computer",
    helper: "Mac or PC.",
    icon: Monitor,
  },
  {
    value: "tablet",
    title: "Tablet",
    helper: "iPad or Android tablet.",
    icon: Tablet,
  },
  {
    value: "smartphone",
    title: "Smartphone",
    helper: "iPhone or Android.",
    icon: Smartphone,
  },
];

function DeviceStep() {
  const navigate = useNavigate();
  const device = useLearnerPrefsStore((s) => s.device);
  const setDevice = useLearnerPrefsStore((s) => s.setDevice);

  function handleSelect(value: LearnerDevice) {
    setDevice(value);
    navigate({ to: "/onboarding/learner/pace" });
  }

  return (
    <OnboardingShell
      step={2}
      headline="What device will you be using for your trips?"
      subhead="A senior on an iPad needs a different Guide than a pro on a PC."
      backTo="/onboarding/learner"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            icon={o.icon}
            title={o.title}
            helper={o.helper}
            selected={device === o.value}
            onSelect={() => handleSelect(o.value)}
          />
        ))}
      </div>
    </OnboardingShell>
  );
}
