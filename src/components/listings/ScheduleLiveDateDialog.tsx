import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { createPublicCohort } from "@/lib/cohorts.functions";
import { friendlyTimezoneLabel } from "@/lib/timezones";

interface ScheduleRow {
  id: string;
  title: string;
  base_price_minor: number;
  currency: string;
  moderation_status: "pending" | "approved" | "declined";
}

interface Props {
  row: ScheduleRow | null;
  onOpenChange: (v: boolean) => void;
}

interface SlotDraft {
  date: string;
  time: string;
}

const EXPIRATION_PRESETS: { value: string; label: string }[] = [
  { value: "1", label: "24 hours" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "never", label: "Never" },
];

function defaultSlot(daysAhead: number): SlotDraft {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(17);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: "17:00" };
}

export function ScheduleLiveDateDialog({ row, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user);
  const open = !!row;

  const [cohortTitle, setCohortTitle] = useState("");
  const [maxSeats, setMaxSeats] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState<30 | 45 | 60 | 90 | 120>(45);
  const [slots, setSlots] = useState<SlotDraft[]>([defaultSlot(2)]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expiration, setExpiration] = useState("7");
  const [profileTz, setProfileTz] = useState<string | null>(null);
  const [tzLoaded, setTzLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const savePublicCohort = useServerFn(createPublicCohort);

  // Reset/prefill when opening for a new row
  useEffect(() => {
    if (!row) return;
    setCohortTitle("");
    setMaxSeats(10);
    setDurationMinutes(45);
    setSlots([defaultSlot(2)]);
    setPrice((row.base_price_minor / 100).toFixed(2));
    setCurrency(row.currency || "USD");
    setExpiration("7");
  }, [row]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfileTz(data?.timezone ?? null);
        setTzLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const tzMissing = tzLoaded && !profileTz;

  function addSlot() {
    setSlots((s) => [...s, defaultSlot(s.length + 2)]);
  }
  function removeSlot(i: number) {
    setSlots((s) => s.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, patch: Partial<SlotDraft>) {
    setSlots((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    if (!profileTz) {
      toast.error("Please set your profile timezone first.");
      return;
    }
    const title = cohortTitle.trim();
    if (!title) {
      toast.error("Please enter a cohort title.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 1) {
      toast.error("Please enter a valid price.");
      return;
    }
    const priceMinor = Math.round(priceNum * 100);
    if (slots.some((s) => !s.date || !s.time)) {
      toast.error("Please complete every session date and time.");
      return;
    }

    const expiresAt =
      expiration === "never"
        ? null
        : new Date(
            Date.now() + Number(expiration) * 24 * 60 * 60 * 1000,
          ).toISOString();

    setSubmitting(true);
    try {
      await savePublicCohort({
        data: {
          journey_id: row.id,
          cohort_title: title,
          max_seats: maxSeats,
          slots: slots.map((s) => ({ date: s.date, time: s.time })),
          price_minor: priceMinor,
          currency: (currency || "USD").toUpperCase(),
          expires_at: expiresAt,
          session_duration_minutes: durationMinutes,
        },
      });
      toast.success("Cohort saved.");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save cohort.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {row?.moderation_status !== "approved" && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border-2 border-[#E8B547] bg-[#FFF7E0] px-3 py-2.5 text-sm">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-[#B45309]"
              aria-hidden
            />
            <p className="text-foreground">
              ⚠️ Note: Your listing is currently pending admin approval. You can
              still set up and save your upcoming dates now, but they will only
              become visible to students once your listing is officially approved
              and live.
            </p>
          </div>
        )}
        <DialogHeader>
          <DialogTitle
            className="text-2xl"
            style={{
              fontFamily: "Montserrat, system-ui, sans-serif",
              fontWeight: 700,
            }}
          >
            Schedule an Upcoming Live Course
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg bg-[#EEF7FF] px-3 py-2.5 text-sm text-[#1B4B7A]">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Create specific upcoming dates and promotional or premium pricing
            for this course. These cohorts will appear publicly on your listing
            page for students to book directly.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <Label htmlFor="schedule-listing-title" className="text-base">
              Listing title
            </Label>
            <Input
              id="schedule-listing-title"
              value={row?.title ?? ""}
              readOnly
              disabled
              className="text-base bg-muted/50"
            />
          </div>

          <div>
            <Label htmlFor="schedule-cohort-title" className="text-base">
              Cohort Title / Promotional Label
            </Label>
            <Input
              id="schedule-cohort-title"
              value={cohortTitle}
              onChange={(e) => setCohortTitle(e.target.value)}
              placeholder="e.g., Early Bird Special, Weekend Intensive, or June Cohort"
              className="text-base"
            />
          </div>

          <div>
            <Label htmlFor="schedule-max-seats" className="text-base">
              Seat capacity
            </Label>
            <Input
              id="schedule-max-seats"
              type="number"
              min={1}
              max={50}
              value={maxSeats}
              onChange={(e) =>
                setMaxSeats(
                  Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                )
              }
              className="text-base"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              How many learners can join this cohort total.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-base">Session schedule</Label>
              <Button type="button" size="sm" variant="ghost" onClick={addSlot}>
                <Plus className="mr-1 size-4" /> Add session
              </Button>
            </div>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={s.date}
                    onChange={(e) => updateSlot(i, { date: e.target.value })}
                    className="flex-1 text-base"
                    required
                  />
                  <Input
                    type="time"
                    value={s.time}
                    onChange={(e) => updateSlot(i, { time: e.target.value })}
                    className="w-32 text-base"
                    required
                  />
                  {slots.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeSlot(i)}
                      aria-label="Remove session"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {profileTz ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Times are scheduled in your listing's time zone:{" "}
                <span className="font-semibold">
                  {friendlyTimezoneLabel(profileTz)}
                </span>
                .
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="schedule-duration" className="text-base">
              Session length
            </Label>
            <Select
              value={String(durationMinutes)}
              onValueChange={(v) =>
                setDurationMinutes(Number(v) as 30 | 45 | 60 | 90 | 120)
              }
            >
              <SelectTrigger id="schedule-duration" className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Applies to every session in this cohort.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3 border-t border-border pt-4">
            <div>
              <Label htmlFor="schedule-price" className="text-base">
                Total price
              </Label>
              <Input
                id="schedule-price"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120.00"
                className="text-base"
                required
              />
            </div>
            <div>
              <Label htmlFor="schedule-currency" className="text-base">
                Currency
              </Label>
              <Input
                id="schedule-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={4}
                className="uppercase text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="schedule-expiration" className="text-base">
              Listing expires in
            </Label>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger id="schedule-expiration" className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tzMissing ? (
            <div className="rounded-xl border-2 border-[#E8B547] bg-[#FFF7E0] p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-[#B45309]"
                  aria-hidden
                />
                <p className="text-foreground">
                  ⚠️ Your profile time zone is missing. We need an IANA time
                  zone (e.g. <span className="font-mono">America/New_York</span>
                  ) to anchor session times correctly. Please set it in{" "}
                  <Link
                    to="/settings/profile"
                    className="font-semibold underline underline-offset-2"
                  >
                    Profile Settings
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="info" disabled={submitting || tzMissing}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Course Dates"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
