import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOAT_FEATURE_GROUPS } from "@/lib/operators.shared";
import { supabase } from "@/integrations/supabase/client";
import {
  isBoatDetailsValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

interface BoatType {
  id: string;
  category_group: string;
  subcategory_name: string;
  icon_url: string | null;
  sort_order: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: (number | "present")[] = ["present", ...Array.from(
  { length: CURRENT_YEAR - 1900 },
  (_, i) => CURRENT_YEAR - 1 - i,
)];
const LENGTH_OPTIONS = Array.from({ length: 150 - 4 + 1 }, (_, i) => 4 + i);

export function BoatDetailsStep({ onBack, onNext }: Props) {
  const business_type = useOperatorOnboardingStore((s) => s.business_type);
  const vessel = useOperatorOnboardingStore((s) => s.vessel);
  const setVessel = useOperatorOnboardingStore((s) => s.setVessel);
  const toggleFeature = useOperatorOnboardingStore((s) => s.toggleFeature);
  const setFeatureComment = useOperatorOnboardingStore((s) => s.setFeatureComment);
  const valid = useOperatorOnboardingStore(isBoatDetailsValid);

  const [boatTypes, setBoatTypes] = useState<BoatType[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("boat_types" as any)
        .select("id, category_group, subcategory_name, icon_url, sort_order")
        .order("sort_order", { ascending: true });
      if (!cancelled && data) setBoatTypes(data as unknown as BoatType[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupedTypes = useMemo(() => {
    const map = new Map<string, BoatType[]>();
    for (const bt of boatTypes) {
      const arr = map.get(bt.category_group) ?? [];
      arr.push(bt);
      map.set(bt.category_group, arr);
    }
    return Array.from(map.entries());
  }, [boatTypes]);

  if (business_type === "guide") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Boat details</h1>
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your boat</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about the vessel you'll run trips on.
        </p>
      </header>

      {/* Boat info */}
      <section className="space-y-6 rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Boat info</h2>

        <div className="space-y-2">
          <Label htmlFor="boat_type">
            Select Boat Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={vessel.boat_type_id || undefined}
            onValueChange={(v) => setVessel({ boat_type_id: v })}
          >
            <SelectTrigger id="boat_type" className="max-w-md">
              <SelectValue placeholder="Choose a boat type" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {groupedTypes.map(([group, items]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {items.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id} className="pl-8 py-2">
                      <span className="flex items-center gap-3">
                        {bt.icon_url ? (
                          <img
                            src={bt.icon_url}
                            alt=""
                            loading="lazy"
                            className="h-7 w-12 object-contain shrink-0"
                          />
                        ) : null}
                        <span>{bt.subcategory_name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Boat Manufacturer</Label>
            <Input
              id="manufacturer"
              value={vessel.manufacturer}
              onChange={(e) => setVessel({ manufacturer: e.target.value })}
              placeholder="e.g. Boston Whaler"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="length">Select Length</Label>
            <Select
              value={vessel.length_ft || undefined}
              onValueChange={(v) => setVessel({ length_ft: v })}
            >
              <SelectTrigger id="length">
                <SelectValue placeholder="Choose length" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {LENGTH_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} ft
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Select
              value={vessel.year || undefined}
              onValueChange={(v) => setVessel({ year: v })}
            >
              <SelectTrigger id="year">
                <SelectValue placeholder="Choose year" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={String(y)} value={String(y)}>
                    {y === "present" ? "Present" : y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3">
              <Checkbox
                checked={vessel.restored}
                onCheckedChange={(c) => setVessel({ restored: c === true })}
              />
              <span className="text-sm font-medium">Restored</span>
            </label>
          </div>
        </div>
      </section>

      {/* Engine */}
      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Engine</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="engine_manufacturer">Engine Manufacturer</Label>
            <Input
              id="engine_manufacturer"
              value={vessel.engine_manufacturer}
              onChange={(e) => setVessel({ engine_manufacturer: e.target.value })}
              placeholder="e.g. Yamaha"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="num_engines">Number of Engines</Label>
            <Input
              id="num_engines"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={vessel.num_engines}
              onChange={(e) => setVessel({ num_engines: e.target.value })}
              placeholder="e.g. 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hp">Horsepower (per engine)</Label>
            <Input
              id="hp"
              type="number"
              inputMode="numeric"
              min={0}
              value={vessel.horsepower_per_engine}
              onChange={(e) => setVessel({ horsepower_per_engine: e.target.value })}
              placeholder="e.g. 300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cruising">Maximum Cruising Speed (knots)</Label>
            <Input
              id="cruising"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={vessel.max_cruising_speed_knots}
              onChange={(e) => setVessel({ max_cruising_speed_knots: e.target.value })}
              placeholder="e.g. 28"
            />
          </div>
        </div>
      </section>

      {/* Capacity */}
      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
        <Label htmlFor="capacity" className="text-base">
          Max Passenger Capacity / Number of Seats{" "}
          <span className="text-destructive">*</span>
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
          The maximum legal / comfortable limit for guests on the vessel. Search results
          will prevent groups larger than this from booking.
        </p>
      </section>

      {/* Features */}
      <section className="space-y-6 rounded-2xl border bg-card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Boat Features</h2>
          <p className="text-sm text-muted-foreground">
            Check anything available on board. Customers filter by these. Add a short
            comment (up to 50 characters) to highlight specifics.
          </p>
        </div>
        <div className="space-y-6">
          {BOAT_FEATURE_GROUPS.map((group) => (
            <div key={group.id}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => {
                  const checked = item.id in vessel.features;
                  const comment = vessel.features[item.id] ?? "";
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-background p-3 transition-colors"
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleFeature(item.id)}
                        />
                        <span className="text-sm font-medium">{item.label}</span>
                      </label>
                      {checked && (
                        <div className="mt-2 pl-7">
                          <Input
                            value={comment}
                            maxLength={50}
                            onChange={(e) =>
                              setFeatureComment(item.id, e.target.value)
                            }
                            placeholder="Add a short note (optional)"
                            className="h-8 text-sm"
                          />
                          <div className="mt-1 text-right text-[10px] text-muted-foreground">
                            {comment.length}/50
                          </div>
                        </div>
                      )}
                    </div>
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
