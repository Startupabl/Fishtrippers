import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DAYS,
  SLOTS,
  EMPTY_SLOTS,
  type AvailabilityRow,
  type Day,
  type Slot,
  type SlotMap,
  getMyAvailability,
  upsertMyAvailability,
} from "@/lib/availability.functions";
import { LocationMissingBanner } from "./LocationMissingBanner";

const DAY_LABELS: Record<Day, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const SLOT_LABELS: Record<Slot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const LEAF_GREEN = "#3DA35D";
const SUNNY_YELLOW = "#FFD23F";

interface Props {
  onSaved?: (row: AvailabilityRow) => void;
  /** Resets internal state to fresh fetch when this changes. */
  refreshKey?: number;
}

export function AvailabilityEditor({ onSaved, refreshKey }: Props) {
  const [paused, setPaused] = useState(false);
  const [slots, setSlots] = useState<SlotMap>(EMPTY_SLOTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMine = useServerFn(getMyAvailability);
  const saveMine = useServerFn(upsertMyAvailability);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMine({})
      .then((row) => {
        if (cancelled) return;
        setPaused(row.paused);
        setSlots(row.slots);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMine, refreshKey]);

  function toggle(day: Day, slot: Slot) {
    setSlots((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: !prev[day][slot] },
    }));
  }

  function reset() {
    setPaused(false);
    setSlots(EMPTY_SLOTS);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const row = await saveMine({ data: { paused, slots } });
      toast.success("Lab hours saved");
      onSaved?.(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading your hours…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LocationMissingBanner />
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="min-w-0">
          <Label htmlFor="pause-switch" className="text-base font-semibold text-foreground">
            Pause All Listings
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Hides the booking button on every Course you offer — great for vacations.
          </p>
        </div>
        <Switch id="pause-switch" checked={paused} onCheckedChange={setPaused} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Weekly hours</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap a slot to mark when you're usually free.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr] bg-muted/40 text-xs font-medium text-muted-foreground">
            <div className="px-3 py-2">Day</div>
            {SLOTS.map((s) => (
              <div key={s} className="px-3 py-2 text-center">
                {SLOT_LABELS[s]}
              </div>
            ))}
          </div>
          {DAYS.map((d) => (
            <div
              key={d}
              className="grid grid-cols-[80px_1fr_1fr_1fr] border-t border-border"
            >
              <div className="flex items-center px-3 py-2 text-sm font-medium text-foreground">
                {DAY_LABELS[d]}
              </div>
              {SLOTS.map((s) => {
                const on = slots[d][s];
                return (
                  <div key={s} className="flex items-center justify-center p-2">
                    <button
                      type="button"
                      onClick={() => toggle(d, s)}
                      aria-pressed={on}
                      className={cn(
                        "h-8 w-full rounded-md border text-xs font-medium transition-colors",
                        on
                          ? "text-white border-transparent"
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                      )}
                      style={on ? { backgroundColor: LEAF_GREEN } : undefined}
                    >
                      {on ? "On" : "Off"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={reset} disabled={saving}>
          Reset
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl text-foreground hover:opacity-90"
          style={{ backgroundColor: SUNNY_YELLOW }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
