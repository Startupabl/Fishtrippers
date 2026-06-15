import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BOAT_FEATURE_GROUPS } from "@/lib/operators.shared";
import {
  isBoatDetailsValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function BoatDetailsStep({ onBack, onNext }: Props) {
  const business_type = useOperatorOnboardingStore((s) => s.business_type);
  const vessel = useOperatorOnboardingStore((s) => s.vessel);
  const setVessel = useOperatorOnboardingStore((s) => s.setVessel);
  const toggleFeature = useOperatorOnboardingStore((s) => s.toggleFeature);
  const valid = useOperatorOnboardingStore(isBoatDetailsValid);

  if (business_type === "guide") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Boat details</h1>
          <p className="mt-2 text-muted-foreground">
            You're listed as an Independent Guide — no boat details needed. Skip ahead.
          </p>
        </header>
        <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
          This step is not applicable to land-based / wade / kayak guides.
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} size="lg">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your boat</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about the vessel you'll run trips on.
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Specs</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer / Make</Label>
            <Input
              id="manufacturer"
              value={vessel.manufacturer}
              onChange={(e) => setVessel({ manufacturer: e.target.value })}
              placeholder="e.g. Boston Whaler"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={vessel.model}
              onChange={(e) => setVessel({ model: e.target.value })}
              placeholder="e.g. Outrage 280"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              inputMode="numeric"
              value={vessel.year}
              onChange={(e) => setVessel({ year: e.target.value })}
              placeholder="e.g. 2021"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length_ft">Length (ft)</Label>
            <Input
              id="length_ft"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={vessel.length_ft}
              onChange={(e) => setVessel({ length_ft: e.target.value })}
              placeholder="e.g. 28"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engine_type">Engine Type</Label>
            <Input
              id="engine_type"
              value={vessel.engine_type}
              onChange={(e) => setVessel({ engine_type: e.target.value })}
              placeholder="e.g. Twin Outboard"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engine_size">Engine Size</Label>
            <Input
              id="engine_size"
              value={vessel.engine_size}
              onChange={(e) => setVessel({ engine_size: e.target.value })}
              placeholder="e.g. 2 x 300HP"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="capacity">
              Max Passenger Capacity / Number of Seats <span className="text-destructive">*</span>
            </Label>
            <Input
              id="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={vessel.max_passenger_capacity}
              onChange={(e) => setVessel({ max_passenger_capacity: e.target.value })}
              placeholder="e.g. 6"
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              The maximum legal / comfortable limit for guests on the vessel. Search results will
              prevent groups larger than this from booking.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Boat Features</h2>
          <p className="text-sm text-muted-foreground">
            Check anything available on board. Customers filter by these.
          </p>
        </div>
        <div className="space-y-6">
          {BOAT_FEATURE_GROUPS.map((group) => (
            <div key={group.id}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const checked = vessel.features.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleFeature(item.id)}
                      />
                      <span className="text-sm font-medium">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

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
