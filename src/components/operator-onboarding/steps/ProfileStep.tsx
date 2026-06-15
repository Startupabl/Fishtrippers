import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isProfileValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function ProfileStep({ onBack, onNext }: Props) {
  const display_name = useOperatorOnboardingStore((s) => s.display_name);
  const location = useOperatorOnboardingStore((s) => s.location);
  const setProfile = useOperatorOnboardingStore((s) => s.setProfile);
  const valid = useOperatorOnboardingStore(isProfileValid);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your business profile</h1>
        <p className="mt-2 text-muted-foreground">
          This is what customers will see in the directory.
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="display_name">Business / Display Name</Label>
          <Input
            id="display_name"
            value={display_name}
            onChange={(e) => setProfile({ display_name: e.target.value })}
            placeholder="e.g. Reel Time Charters"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location / Base of Operations</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setProfile({ location: e.target.value })}
            placeholder="e.g. Destin, FL"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            City and state, marina name, or general region.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!valid} onClick={onNext} size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
