import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  createCustomOffer,
  listAvailableCohorts,
  type AvailableCohort,
} from "@/lib/bookings.functions";
import { listMyJourneys } from "@/lib/journeys.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { friendlyTimezoneLabel } from "@/lib/timezones";
import { formatUtcInZone, tzAbbrev, zonedWallTimeToUtcISO } from "@/lib/tz";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  threadId: string;
  defaultCurrency?: string;
  onSent?: (bookingId: string) => void;
}

interface SlotDraft {
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
}

type Mode = "new_cohort" | "existing_cohort";

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

function deriveTzLabel(tz: string | null | undefined): string {
  if (!tz) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    return (name ?? "").slice(0, 10);
  } catch {
    return "";
  }
}

function nameOfProfile(p: any): string {
  if (!p) return "Learner";
  if (p.display_name?.trim()) return p.display_name.trim();
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || (p.email?.split("@")[0] ?? "Learner");
}

function cohortDropdownLabel(c: AvailableCohort): string {
  const seatsLeft = c.max_seats - c.filled_seats;
  const seatSuffix = `${seatsLeft}/${c.max_seats} Seats Left`;
  // Prefer the admin_label baked at cohort creation — it already includes
  // the original learner's name (e.g. "Title • Tuesdays @ 2:00 PM • Starts May 26 (Sarah M.)").
  if (c.admin_label && c.admin_label.trim()) {
    return `${c.admin_label} — ${seatSuffix}`;
  }
  const arr = c.session_dates_times_array ?? [];
  const first = arr[0]?.starts_at;
  if (!first) return `[${c.listing_title}] — ${seatSuffix}`;
  const d = new Date(first);
  const dow = d.toLocaleDateString("en-US", { weekday: "long" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const startDate = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `[${c.listing_title}] ${dow}s @ ${time} • Starts ${startDate} — ${seatSuffix}`;
}


export function CustomOfferComposer({
  open,
  onOpenChange,
  threadId,
  defaultCurrency = "USD",
  onSent,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<Mode>("new_cohort");

  // shared
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [expiration, setExpiration] = useState("7");
  const [profileTz, setProfileTz] = useState<string | null>(null);
  const [tzLoaded, setTzLoaded] = useState(false);
  const [manualTz, setManualTz] = useState("");
  const [learnerName, setLearnerName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // new cohort
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>("");
  const [maxSeats, setMaxSeats] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [slots, setSlots] = useState<SlotDraft[]>([defaultSlot(2)]);

  // existing cohort
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");

  const send = useServerFn(createCustomOffer);
  const fetchCohorts = useServerFn(listAvailableCohorts);
  const fetchMyJourneys = useServerFn(listMyJourneys);

  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery({
    queryKey: ["available-cohorts", user?.id],
    queryFn: () => fetchCohorts(),
    enabled: open && !!user && mode === "existing_cohort",
  });

  const { data: myJourneys = [], isLoading: journeysLoading } = useQuery({
    queryKey: ["my-journeys-for-offer", user?.id],
    queryFn: () => fetchMyJourneys(),
    enabled: open && !!user && mode === "new_cohort",
  });

  const selectedJourney = useMemo(
    () => myJourneys.find((j) => j.id === selectedJourneyId) ?? null,
    [myJourneys, selectedJourneyId],
  );

  const selectedCohort = useMemo(
    () => cohorts.find((c) => c.id === selectedCohortId) ?? null,
    [cohorts, selectedCohortId],
  );

  // Fetch the learner name + aide tz when modal opens.
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

    supabase
      .from("message_threads")
      .select("learner_id")
      .eq("id", threadId)
      .maybeSingle()
      .then(async ({ data: thread }) => {
        if (cancelled || !thread?.learner_id) return;
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, display_name, email")
          .eq("id", thread.learner_id)
          .maybeSingle();
        if (!cancelled) setLearnerName(nameOfProfile(prof));
      });

    return () => {
      cancelled = true;
    };
  }, [open, user, threadId]);

  const tzMissing = tzLoaded && !profileTz;
  const autoLabel = deriveTzLabel(profileTz);
  const tzLabel = (tzMissing ? manualTz : autoLabel).trim();

  function addSlot() {
    setSlots((s) => [...s, defaultSlot(s.length + 2)]);
  }
  function removeSlot(i: number) {
    setSlots((s) => s.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, patch: Partial<SlotDraft>) {
    setSlots((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function resetForm() {
    setPrice("");
    setExpiration("7");
    setSelectedJourneyId("");
    setMaxSeats(1);
    setDurationMinutes(45);
    setSlots([defaultSlot(2)]);
    setSelectedCohortId("");
    setManualTz("");
  }

  function computeExpiresAt(): string | null {
    if (expiration === "never") return null;
    const days = Number(expiration);
    if (!Number.isFinite(days)) return null;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price.");
      return;
    }
    if (!profileTz) {
      toast.error(
        "Please set your time zone in Profile Settings before sending an offer.",
      );
      return;
    }

    const payload: any = {
      thread_id: threadId,
      total_price_minor: Math.round(priceNum * 100),
      currency,
      time_zone_label: tzLabel || null,
      author_timezone: profileTz,
      expires_at: computeExpiresAt(),
      mode,
    };

    if (mode === "new_cohort") {
      if (!selectedJourney) {
        toast.error("Pick which listing this offer is for.");
        return;
      }
      if (slots.length === 0) {
        toast.error("Add at least one session.");
        return;
      }
      const isoSlots = slots.map((s) => ({
        starts_at: zonedWallTimeToUtcISO(s.date, s.time, profileTz),
        duration_minutes: durationMinutes,
      }));
      if (isoSlots.some((s) => Number.isNaN(new Date(s.starts_at).getTime()))) {
        toast.error("One of the session dates is invalid.");
        return;
      }
      payload.listing_title = selectedJourney.title;
      payload.max_seats = maxSeats;
      payload.slots = isoSlots;
    } else {
      if (!selectedCohortId) {
        toast.error("Pick a cohort to link this offer to.");
        return;
      }
      payload.class_session_id = selectedCohortId;
    }

    setSubmitting(true);
    try {
      const res = await send({ data: payload });
      toast.success("Custom offer sent!");
      onOpenChange(false);
      onSent?.(res.booking_id);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send offer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-2xl"
            style={{
              fontFamily: "Montserrat, system-ui, sans-serif",
              fontWeight: 700,
            }}
          >
            Create a Custom Offer for {learnerName || "Learner"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Start a brand-new cohort, or link this offer into one of your
            existing class sessions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setMode("new_cohort")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === "new_cohort"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create New Custom Schedule
            </button>
            <button
              type="button"
              onClick={() => setMode("existing_cohort")}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === "existing_cohort"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Link to an Existing Cohort
            </button>
          </div>

          {/* New cohort fields */}
          {mode === "new_cohort" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="listing-select" className="text-base">
                  Which listing is this offer for?
                </Label>
                {journeysLoading ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Loading your listings…
                  </p>
                ) : (
                  <Select
                    value={selectedJourneyId}
                    onValueChange={setSelectedJourneyId}
                  >
                    <SelectTrigger id="listing-select" className="text-base">
                      <SelectValue placeholder="Choose one of your listings" />
                    </SelectTrigger>
                    <SelectContent>
                      {myJourneys.map((j) => {
                        const statusSuffix =
                          j.status === "published"
                            ? ""
                            : j.status === "draft"
                              ? " · Draft"
                              : j.moderation_status === "pending"
                                ? " · Pending"
                                : ` · ${j.status}`;
                        return (
                          <SelectItem key={j.id} value={j.id}>
                            {j.title}
                            {statusSuffix}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  The offer will be tied to this exact listing.
                </p>
              </div>

              <div>
                <Label htmlFor="max-seats" className="text-base">
                  Seat capacity
                </Label>
                <Input
                  id="max-seats"
                  type="number"
                  min={1}
                  max={50}
                  value={maxSeats}
                  onChange={(e) =>
                    setMaxSeats(
                      Math.max(
                        1,
                        Math.min(50, Number(e.target.value) || 1),
                      ),
                    )
                  }
                  className="text-base"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  How many learners can join this cohort total (including this
                  learner). Set to 1 for a private 1:1.
                </p>
              </div>

              <div>
                <Label htmlFor="duration-select" className="text-base">
                  Session length
                </Label>
                <Select
                  value={String(durationMinutes)}
                  onValueChange={(v) => setDurationMinutes(Number(v))}
                >
                  <SelectTrigger id="duration-select" className="text-base">
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
                  Applies to every session in this offer.
                </p>
              </div>


              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-base">Session schedule</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={addSlot}
                  >
                    <Plus className="mr-1 size-4" /> Add session
                  </Button>
                </div>
                <div className="space-y-2">
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={s.date}
                        onChange={(e) =>
                          updateSlot(i, { date: e.target.value })
                        }
                        className="flex-1 text-base"
                        required
                      />
                      <Input
                        type="time"
                        value={s.time}
                        onChange={(e) =>
                          updateSlot(i, { time: e.target.value })
                        }
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
            </div>
          )}

          {/* Existing cohort dropdown */}
          {mode === "existing_cohort" && (
            <div className="space-y-3">
              <Label className="text-base">Pick an existing cohort</Label>
              {cohortsLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading your cohorts…
                </p>
              ) : cohorts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  You have no upcoming cohorts with open seats. Switch to{" "}
                  <button
                    type="button"
                    className="font-semibold text-foreground underline"
                    onClick={() => setMode("new_cohort")}
                  >
                    Create New Custom Schedule
                  </button>
                  .
                </div>
              ) : (
                <Select
                  value={selectedCohortId}
                  onValueChange={setSelectedCohortId}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Choose a cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {cohortDropdownLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedCohort && (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Locked schedule
                  </p>
                  <ul className="space-y-1 text-sm">
                    {(selectedCohort.session_dates_times_array ?? []).map(
                      (s, i) => (
                        <li key={i} className="text-foreground">
                          Session {i + 1}:{" "}
                          {profileTz
                            ? `${formatUtcInZone(s.starts_at, profileTz, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })} ${tzAbbrev(profileTz, new Date(s.starts_at))}`
                            : new Date(s.starts_at).toLocaleString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Always-visible price / currency / expiration */}
          <div className="grid grid-cols-[1fr_120px] gap-3 border-t border-border pt-4">
            <div>
              <Label htmlFor="price" className="text-base">
                Total price
              </Label>
              <Input
                id="price"
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
              <Label htmlFor="currency" className="text-base">
                Currency
              </Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={4}
                className="uppercase text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expiration" className="text-base">
              Offer expires in
            </Label>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger id="expiration" className="text-base">
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
            <div className="rounded-xl border-2 border-[#FFD23F] bg-[#FFF8DC] p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-[#B45309]"
                  aria-hidden
                />
                <p className="text-foreground">
                  ⚠️ Your profile time zone is missing. We need an IANA time
                  zone (e.g. <span className="font-mono">America/New_York</span>)
                  to anchor session times correctly. Please set it in{" "}
                  <Link
                    to="/settings/profile"
                    className="font-semibold underline underline-offset-2"
                  >
                    Profile Settings
                  </Link>{" "}
                  before sending an offer.
                </p>
              </div>
            </div>
          ) : profileTz ? (
            <p className="text-xs text-muted-foreground">
              Session times you enter are interpreted in your profile time
              zone (
              <span className="font-semibold">
                {friendlyTimezoneLabel(profileTz)}
              </span>
              ) and shown to the learner in their own time zone.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="info"
              disabled={submitting || tzMissing}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send Custom Offer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
