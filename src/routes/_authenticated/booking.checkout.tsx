import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MapPin,
  Ship,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getTripReviewDetails,
  createTripDepositCheckout,
  simulateTripDepositPayment,
  type TripReviewDetails,
} from "@/lib/trip-bookings.functions";
import { getCancellationPolicy } from "@/lib/cancellation-policies";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";


const searchSchema = z.object({
  trip_id: fallback(z.string(), "").default(""),
  trip_date: fallback(z.string(), "").default(""),
  guests: fallback(z.number(), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/booking/checkout")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Review your booking — FishTrippers" }] }),
  component: BookingReviewPage,
});

function formatStartTime(t?: string | null) {
  if (!t) return null;
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  if (Number.isNaN(h)) return null;
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${mm ?? "00"} ${period}`;
}

function navigateToStripe(url: string) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    /* fall through */
  }
  window.location.assign(url);
}

function BookingReviewPage() {
  const navigate = useNavigate();
  const { trip_id, trip_date, guests } = Route.useSearch();
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const currency = useCurrencyStore((s) => s.currency);

  const fetchDetails = useServerFn(getTripReviewDetails);
  const startCheckout = useServerFn(createTripDepositCheckout);
  const simulatePayment = useServerFn(simulateTripDepositPayment);

  const [details, setDetails] = useState<TripReviewDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const simulateEnabled = import.meta.env.VITE_SIMULATE_PAYMENTS === "true";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!initialized || !user) return;
    if (!trip_id || !trip_date || !guests) {
      setError("Missing trip selection. Please pick a date again.");
      return;
    }
    fetchDetails({ data: { trip_id, trip_date, guests } })
      .then((d) => {
        setDetails(d);
        setFirstName(d.viewer.first_name?.trim() ?? "");
        setLastName(d.viewer.last_name?.trim() ?? "");
        if (d.viewer.phone) {
          // E.164 starts with '+'; if missing assume US and prefix.
          const raw = d.viewer.phone.trim();
          setPhone(raw.startsWith("+") ? raw : `+1${raw.replace(/[^0-9]/g, "")}`);
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load trip."),
      );
  }, [trip_id, trip_date, guests, initialized, user, fetchDetails]);

  const phoneValid = !!phone && isValidPhoneNumber(phone);

  async function handleContinue() {
    if (!details) return;
    if (!firstName.trim() || !lastName.trim() || !phoneValid || !phone) return;
    setPaying(true);
    try {
      const primaryAnglerName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { url } = await startCheckout({
        data: {
          trip_id: details.trip.id,
          trip_date: details.trip_date,
          guests: details.guests,
          primary_angler_name: primaryAnglerName || "Angler",
          phone: phone.trim(),
          notes: notes.trim() || null,
        },
      });
      if (!url) throw new Error("Stripe did not return a checkout URL.");
      navigateToStripe(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
      setPaying(false);
    }
  }

  async function handleSimulate() {
    if (!details) return;
    if (!firstName.trim() || !lastName.trim() || !phoneValid || !phone) {
      toast.error("Fill in your name and a valid phone first.");
      return;
    }
    setSimulating(true);
    try {
      const primaryAnglerName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { booking_id } = await simulatePayment({
        data: {
          trip_id: details.trip.id,
          trip_date: details.trip_date,
          guests: details.guests,
          primary_angler_name: primaryAnglerName || "Angler",
          phone: phone.trim(),
          notes: notes.trim() || null,
        },
      });
      navigate({
        to: "/checkout/success",
        search: { booking_id } as never,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not simulate payment.");
      setSimulating(false);
    }
  }




  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Booking unavailable
          </h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => navigate({ to: "/" })}
          >
            Back to home
          </Button>
        </main>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 size-6 animate-spin" />
          Loading your booking…
        </main>
      </div>
    );
  }

  const fmt = (m: number) =>
    formatCurrency(
      convertMinor(m, details.pricing.currency as CurrencyCode, currency),
      currency,
    );

  const policy = getCancellationPolicy(details.operator.cancellation_policy);
  const meetingPoint =
    details.trip.departure_address ||
    details.operator.default_departure_address ||
    details.operator.default_departure_city ||
    "Meeting point shared by your captain";

  const dateLabel = (() => {
    try {
      return format(parseISO(details.trip_date), "EEEE, MMMM d, yyyy");
    } catch {
      return details.trip_date;
    }
  })();
  const startTimeLabel = formatStartTime(details.trip.start_time);

  const canContinue = firstName.trim() && lastName.trim() && phoneValid && !paying;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1fr_420px] md:py-12">
        {/* LEFT COLUMN */}
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              Review your booking
            </h1>
            <p className="mt-2 text-muted-foreground">
              Add your details below, then secure your spot with the deposit.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Angler details
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first-name">
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.slice(0, 80))}
                    placeholder="First name"
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">
                    Last name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.slice(0, 80))}
                    placeholder="Last name"
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">
                  Mobile phone number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <PhoneInput
                  id="phone"
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="US"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Enter your phone number"
                  className="ft-phone-input mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick your country and we'll format the rest. Your captain
                  will text you here with meeting details.
                </p>
                {phone && !phoneValid && (
                  <p className="mt-1 text-xs text-destructive">
                    Please enter a valid phone number for the selected country.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">
                  Special notes & group details{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  placeholder="Beginners in the group, target species, mobility needs, etc."
                  rows={4}
                  className="mt-1.5"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {notes.length} / 500
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldCheck className="size-5 text-primary" />
              Policies & guidelines
            </h2>
            <div className="space-y-4 text-sm text-foreground">
              <div>
                <p className="font-semibold">
                  Cancellation policy ({policy.label})
                </p>
                <p className="mt-1 text-muted-foreground">{policy.text}</p>
              </div>
              <div>
                <p className="font-semibold">Weather policy</p>
                <p className="mt-1 text-muted-foreground">
                  The captain has sole discretion to cancel or reschedule due
                  to dangerous sea conditions. If canceled by the captain due
                  to weather, your deposit is 100% refunded.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN — sticky trip summary */}
        <aside>
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {details.operator.cover_image_url ? (
              <img
                src={details.operator.cover_image_url}
                alt={details.trip.title}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="flex h-44 w-full items-center justify-center bg-muted">
                <Ship className="size-12 text-muted-foreground" />
              </div>
            )}

            <div className="space-y-4 p-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {details.trip.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  with Captain {details.captain_name}
                </p>
              </div>

              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {dateLabel}
                    {startTimeLabel ? ` · ${startTimeLabel}` : ""}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{meetingPoint}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {details.guests} guest{details.guests === 1 ? "" : "s"}
                    {details.trip.charter_type === "shared_tour"
                      ? " (shared tour)"
                      : " (private charter)"}
                  </span>
                </li>
              </ul>

              {/* 3-tier pricing stack */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total trip price
                  </span>
                  <span className="font-medium text-foreground">
                    {fmt(details.pricing.total_minor)}
                  </span>
                </div>

                <div className="rounded-xl bg-primary/10 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Pay today
                    </span>
                    <Badge className="bg-primary text-primary-foreground">
                      10% deposit
                    </Badge>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {fmt(details.pricing.deposit_minor)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Charged securely via Stripe.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-border p-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-foreground">
                      Pay captain at the dock
                    </span>
                    <span className="font-medium text-foreground">
                      {fmt(details.pricing.balance_minor)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Remaining 90% balance, due on the day of your trip. Cash,
                    Venmo, Zelle, or other methods accepted by your captain.
                  </p>
                </div>
              </div>

              <Button
                className="w-full text-base font-semibold"
                size="lg"
                onClick={handleContinue}
                disabled={!canContinue}
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Redirecting to Stripe…
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>

              {simulateEnabled && (
                <div className="space-y-2 rounded-xl border border-dashed border-amber-500/60 bg-amber-500/5 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-500/60 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                    onClick={handleSimulate}
                    disabled={!firstName.trim() || !lastName.trim() || !phoneValid || simulating || paying}
                  >
                    {simulating ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Simulating payment…
                      </>
                    ) : (
                      "⚡ Simulate payment success (dev)"
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-amber-700/80 dark:text-amber-300/80">
                    Dev only — skips Stripe and marks this booking as paid so we can map the post-payment flow.
                  </p>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                By clicking "Continue to Payment", you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and authorize Fishtrippers to process today's deposit charge.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-border/60 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo size="md" />
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 size-4" /> Back
        </Button>
      </div>
    </header>
  );
}
