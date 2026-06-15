import { Ship, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOperatorOnboardingStore } from "@/stores/useOperatorOnboardingStore";

interface Props {
  onNext: () => void;
}

export function BusinessTypeStep({ onNext }: Props) {
  const business_type = useOperatorOnboardingStore((s) => s.business_type);
  const setBusinessType = useOperatorOnboardingStore((s) => s.setBusinessType);

  const options = [
    {
      id: "charter" as const,
      title: "Charter Business",
      description: "I run trips on my own boat or vessel.",
      icon: Ship,
    },
    {
      id: "guide" as const,
      title: "Independent Guide",
      description: "No boat — shore, wade, kayak, or land-based trips.",
      icon: Anchor,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">What kind of operator are you?</h1>
        <p className="mt-2 text-muted-foreground">
          This shapes what we ask next. You can change it later before submitting.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = business_type === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBusinessType(opt.id)}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border-2 p-6 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <Icon className={cn("h-8 w-8", selected ? "text-primary" : "text-muted-foreground")} />
              <div>
                <h3 className="text-lg font-semibold">{opt.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button disabled={!business_type} onClick={onNext} size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
