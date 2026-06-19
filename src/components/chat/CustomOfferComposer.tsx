import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { createCustomOffer } from "@/lib/bookings.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { friendlyTimezoneLabel } from "@/lib/timezones";
import { tzAbbrev, zonedWallTimeToUtcISO } from "@/lib/tz";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { DeparturePointPicker } from "@/components/operator-onboarding/trips/DeparturePointPicker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  threadId: string;
  defaultCurrency?: string;
  anglerName?: string;
  onSent?: (bookingId: string) => void;
}

const EXPIRATION_PRESETS: { value: string; label: string }[] = [
  { value: "1", label: "24 hours" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "never", label: "Never" },
];

const DURATION_HOURS = Array.from({ length: 14 }, (_, i) => i + 1);

interface MeetingPoint {
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

function defaultDate(): string {
  const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CustomOfferComposer({
  open,
  onOpenChange,
  threadId,
  defaultCurrency = "USD",
  anglerName,
  onSent,
}: Props) {
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState<number>(4);
  const [totalAnglers, setTotalAnglers] = useState<number>(2);
  const [tripDate, setTripDate] = useState<string>(defaultDate());
  const [startTime, setStartTime] = useState<string>("07:00");
  const [meetingPoint, setMeetingPoint] = useState<MeetingPoint>({
    address: "",
    lat: null,
    lng: null,
    placeId: null,
  });
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [depositPrice, setDepositPrice] = useState<string>("");
  const [depositTouched, setDepositTouched] = useState(false);
  const [expiration, setExpiration] = useState<string>("3");

  const [profileTz, setProfileTz] = useState<string | null>(null);
  const [operatorCurrency, setOperatorCurrency] = useState<string | null>(null);
  const [tzLoaded, setTzLoaded] = useState(false);
  const [resolvedAnglerName, setResolvedAnglerName] = useState<string>(anglerName ?? "");
  const [submitting, setSubmitting] = useState(false);

  const send = useServerFn(createCustomOffer);

  // Suggest 10% deposit when total changes (unless guide overrode it)
  useEffect(() => {
    if (depositTouched) return;
    const n = Number(totalPrice);
    if (!Number.isFinite(n) || n <= 0) {
      setDepositPrice("");
      return;
    }
    const suggested = Math.max(1, Math.round(n * 0.1 * 100) / 100);
    setDepositPrice(String(suggested));
  }, [totalPrice, depositTouched]);

  // Fetch guide profile (timezone), operator base currency, angler name
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
      .from("operators")
      .select("base_currency")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.base_currency) {
          setOperatorCurrency(data.base_currency);
          setCurrency(data.base_currency);
        }
      });

    if (!anglerName) {
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
          if (cancelled) return;
          const full = [prof?.first_name, prof?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
          setResolvedAnglerName(
            prof?.display_name?.trim() ||
              full ||
              prof?.email?.split("@")[0] ||
              "Angler",
          );
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open, user, threadId, anglerName]);

  useEffect(() => {
    if (anglerName) setResolvedAnglerName(anglerName);
  }, [anglerName]);

  const tzMissing = tzLoaded && !profileTz;
  const tzFriendly = useMemo(
    () => (profileTz ? friendlyTimezoneLabel(profileTz) : ""),
    [profileTz],
  );
  const tzAbbr = useMemo(
    () => (profileTz ? tzAbbrev(profileTz) : ""),
    [profileTz],
  );

  function resetForm() {
    setTitle("");
    setDurationHours(4);
    setTotalAnglers(2);
    setTripDate(defaultDate());
    setStartTime("07:00");
    setMeetingPoint({ address: "", lat: null, lng: null, placeId: null });
    setCurrency(operatorCurrency ?? defaultCurrency);
    setTotalPrice("");
    setDepositPrice("");
    setDepositTouched(false);
    setExpiration("3");
  }

  function computeExpiresAt(): string | null {
    if (expiration === "never") return null;
    const days = Number(expiration);
    if (!Number.isFinite(days)) return null;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Add a trip title (at least 3 characters).");
      return;
    }
    if (!meetingPoint.address || meetingPoint.address.trim().length < 2) {
      toast.error("Pick a meeting point.");
      return;
    }
    if (!profileTz) {
      toast.error(
        "Please set your time zone in Profile Settings before sending a custom trip.",
      );
      return;
    }
    const totalNum = Number(totalPrice);
    const depNum = Number(depositPrice);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      toast.error("Enter a valid total price.");
      return;
    }
    if (!Number.isFinite(depNum) || depNum <= 0 || depNum > totalNum) {
      toast.error("Deposit must be greater than 0 and not more than the total.");
      return;
    }

    const startsAt = zonedWallTimeToUtcISO(tripDate, startTime, profileTz);
    if (Number.isNaN(new Date(startsAt).getTime())) {
      toast.error("That date and time look invalid.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await send({
        data: {
          thread_id: threadId,
          title: title.trim(),
          duration_minutes: durationHours * 60,
          total_anglers: totalAnglers,
          trip_date: tripDate,
          starts_at: startsAt,
          meeting_point_address: meetingPoint.address.trim(),
          meeting_point_lat: meetingPoint.lat,
          meeting_point_lng: meetingPoint.lng,
          meeting_point_place_id: meetingPoint.placeId,
          currency: currency.toUpperCase(),
          total_price_minor: Math.round(totalNum * 100),
          deposit_minor: Math.round(depNum * 100),
          author_timezone: profileTz,
          time_zone_label: tzAbbr || null,
          expires_at: computeExpiresAt(),
        },
      });
      toast.success("Custom trip sent!");
      onOpenChange(false);
      onSent?.(res.booking_id);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send custom trip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-2xl"
            style={{
              fontFamily: "Montserrat, system-ui, sans-serif",
              fontWeight: 700,
            }}
          >
            Create a Custom Trip for {resolvedAnglerName || "Angler"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Use this form to send a tailored trip an angler can book immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="ct-title" className="text-base">
              Trip title
            </Label>
            <Input
              id="ct-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Custom 6-Hour Private Night Fishing"
              maxLength={140}
              required
              className="text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ct-duration" className="text-base">
                Duration
              </Label>
              <Select
                value={String(durationHours)}
                onValueChange={(v) => setDurationHours(Number(v))}
              >
                <SelectTrigger id="ct-duration" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ct-anglers" className="text-base">
                Total anglers
              </Label>
              <Input
                id="ct-anglers"
                type="number"
                min={1}
                max={50}
                value={totalAnglers}
                onChange={(e) =>
                  setTotalAnglers(
                    Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  )
                }
                className="text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ct-date" className="text-base">
                Trip date
              </Label>
              <Input
                id="ct-date"
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div>
              <Label htmlFor="ct-time" className="text-base">
                Start time
              </Label>
              <Input
                id="ct-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="text-base"
              />
            </div>
          </div>

          <div>
            <Label className="text-base">Meeting point</Label>
            <div className="mt-1">
              <DeparturePointPicker
                value={meetingPoint}
                onChange={(v) => setMeetingPoint(v)}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Street address or marina — picked from Google Places.
            </p>
          </div>

          <div className="grid grid-cols-[120px_1fr_1fr] gap-3 border-t border-border pt-4">
            <div>
              <Label htmlFor="ct-currency" className="text-base">
                Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="ct-currency" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ct-total" className="text-base">
                Total price
              </Label>
              <Input
                id="ct-total"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder="600.00"
                required
                className="text-base"
              />
            </div>
            <div>
              <Label htmlFor="ct-deposit" className="text-base">
                Deposit (due now)
              </Label>
              <Input
                id="ct-deposit"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={depositPrice}
                onChange={(e) => {
                  setDepositTouched(true);
                  setDepositPrice(e.target.value);
                }}
                placeholder="60.00"
                required
                className="text-base"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Deposit auto-suggests 10% of the total; adjust as needed.
          </p>

          <div>
            <Label htmlFor="ct-expiration" className="text-base">
              Offer expires in
            </Label>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger id="ct-expiration" className="text-base">
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
                  ⚠️ Your profile time zone is missing. Please set it in{" "}
                  <Link
                    to="/settings/profile"
                    className="font-semibold underline underline-offset-2"
                  >
                    Profile Settings
                  </Link>{" "}
                  before sending a custom trip.
                </p>
              </div>
            </div>
          ) : profileTz ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-foreground dark:border-amber-700 dark:bg-amber-950/30">
              ⚠️ Trip times you enter are interpreted in your profile time zone (
              <span className="font-semibold">
                {tzFriendly}
                {tzAbbr ? ` (${tzAbbr})` : ""}
              </span>
              ) and will be shown to the angler in your local time zone.
            </div>
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
              Send Custom Trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
