import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { ArrowLeft, CalendarClock, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { convertMinor } from "@/lib/currency";
import { formatCurrency } from "@/lib/format-currency";
import { usePlatformFee } from "@/hooks/usePlatformFee";
import {
  createBookingCheckoutSession,
  getBooking,
  type BookingDetail,
} from "@/lib/bookings.functions";
import {
  validatePromoCodeForCheckout,
  applyPromoToSubtotal,
  type ValidatedPromoCode,
} from "@/lib/promo-codes.functions";
import { useProfileStore } from "@/stores/useProfileStore";
import { resolveViewerTimezone } from "@/lib/tz";
import { friendlyTimezoneLabel } from "@/lib/timezones";
import { DualZoneTime } from "@/components/chat/DualZoneTime";


const searchSchema = z.object({
  bookingId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/booking-review")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Review your booking — Lemonaidely" }] }),
  component: BookingReviewPage,
});

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };
const body = { fontFamily: "Inter, system-ui, sans-serif", fontSize: 18 };

function BookingReviewPage() {
  const { bookingId } = Route.useSearch();
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const currency = useCurrencyStore((s) => s.currency);
  const profileTz = useProfileStore((s) => s.timezone);
  const viewerTz = resolveViewerTimezone(profileTz);
  const { label: feeLabel, rate: feeRate } = usePlatformFee();

  const fetchBooking = useServerFn(getBooking);
  const startCheckout = useServerFn(createBookingCheckoutSession);
  const validatePromo = useServerFn(validatePromoCodeForCheckout);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<ValidatedPromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);


  useEffect(() => {
    // Auth gating is handled by the `_authenticated` layout. Wait until the
    // auth store has hydrated AND a user is present before fetching, so a
    // transient null during SPA navigation doesn't bounce us to /login.
    if (!initialized || !user) return;
    if (!bookingId) {
      setError("Missing booking.");
      return;
    }
    fetchBooking({ data: { booking_id: bookingId } })
      .then((b) => setBooking(b))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load booking."));
  }, [bookingId, initialized, user, fetchBooking]);

  function navigateToStripe(url: string) {
    // Try top-frame first (escapes the Lovable preview iframe in production),
    // then fall back to current-frame navigation if the browser blocks it
    // (cross-origin iframe sandboxing in the editor preview).
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      window.location.assign(url);
      return;
    } catch {
      /* fall through */
    }
    window.location.href = url;
  }

  async function handlePay() {
    if (!booking) return;
    setPaying(true);
    try {
      const { url } = await startCheckout({
        data: {
          booking_id: booking.id,
          ...(appliedPromo ? { promo_code: appliedPromo.code } : {}),
        },
      });
      if (!url) throw new Error("Stripe did not return a checkout URL.");
      navigateToStripe(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
      setPaying(false);
    }
  }

  async function handleApplyPromo() {
    if (!booking) return;
    const code = promoInput.trim().toUpperCase();
    if (code.length < 3) {
      setPromoError("Enter a code to apply.");
      return;
    }
    setApplyingPromo(true);
    setPromoError(null);
    try {
      const res = await validatePromo({
        data: { bookingId: booking.id, code },
      });
      if (!res.ok) {
        setPromoError(res.error);
        return;
      }
      setAppliedPromo(res.promo);
      setPromoInput(res.promo.code);
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Could not validate code.");
    } finally {
      setApplyingPromo(false);
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  }



  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl text-foreground" style={display}>Booking unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button asChild className="mt-6"><Link to="/dashboard/messages">Back to messages</Link></Button>
        </main>
      </div>
    );
  }

  if (!booking) {
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
    formatCurrency(convertMinor(m, booking.currency as CurrencyCode, currency), currency);

  return (
    <div className="min-h-screen bg-background" style={body}>
      <PageHeader />
      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1fr_400px] md:py-12">
        <section>
          <h1 className="text-3xl text-foreground md:text-4xl" style={{ ...display, fontWeight: 700 }}>
            Review your booking
          </h1>
          <p className="mt-2 text-muted-foreground">
            Confirm the details below, then complete payment securely.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={
                  booking.aide_avatar_url ??
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(booking.aide_name)}`
                }
                alt={booking.aide_name}
                className="size-12 rounded-full object-cover"
              />
              <div>
                <p className="text-base font-bold text-foreground" style={display}>
                  {booking.aide_name}
                </p>
                {booking.course_title && (
                  <p className="text-sm text-muted-foreground">{booking.course_title}</p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-foreground" style={display}>
                Scheduled sessions
              </p>
              <ul className="space-y-2">
                {booking.slots.map((s) => (
                  <li key={s.id} className="flex items-start gap-2 text-foreground">
                    <CalendarClock className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    <DualZoneTime
                      utcIso={s.starts_at}
                      viewerTz={viewerTz}
                      otherTz={booking.author_timezone}
                      viewerLabel="Your time"
                      otherLabel="Aide's time"
                      durationMinutes={s.duration_minutes}
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                {booking.author_timezone && booking.author_timezone !== viewerTz
                  ? `Times shown in your time zone (${friendlyTimezoneLabel(viewerTz)}) and the Aide's time zone (${friendlyTimezoneLabel(booking.author_timezone)}).`
                  : `Times shown in your time zone (${friendlyTimezoneLabel(viewerTz)}).`}
              </p>
            </div>
          </div>
        </section>

        <aside>
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-xl text-foreground" style={{ ...display, fontWeight: 700 }}>
              Price breakdown
            </h2>

            {/* Promo code input */}
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <label
                htmlFor="promo-code"
                className="text-sm font-semibold text-foreground"
                style={display}
              >
                Have a promo code?
              </label>
              {appliedPromo ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span className="flex items-center gap-2">
                    <Check className="size-4" />
                    <strong className="font-semibold tracking-wider">
                      {appliedPromo.code}
                    </strong>
                    <span className="text-green-600">
                      applied —{" "}
                      {appliedPromo.discount_type === "percent"
                        ? `${appliedPromo.discount_value}% off`
                        : `$${appliedPromo.discount_value} off`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    aria-label="Remove promo code"
                    className="rounded-md p-1 text-green-700 hover:bg-green-100"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex items-stretch gap-2">
                    <Input
                      id="promo-code"
                      value={promoInput}
                      onChange={(e) =>
                        setPromoInput(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9_-]/g, "")
                            .slice(0, 20),
                        )
                      }
                      placeholder="ENTER CODE"
                      className="rounded-xl tracking-wider"
                      disabled={applyingPromo}
                    />
                    

            <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={applyingPromo || promoInput.trim().length < 3}
                      className="rounded-xl"
                    >
                      {applyingPromo ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {promoError && (
                    <p className="mt-2 text-xs text-destructive">{promoError}</p>
                  )}
                </>
              )}
            </div>

            {(() => {
              const originalGross = booking.total_price;
              const { discountMinor, newSubtotalMinor } = appliedPromo
                ? applyPromoToSubtotal(originalGross, appliedPromo)
                : { discountMinor: 0, newSubtotalMinor: originalGross };
              const total = newSubtotalMinor;
              const fee = appliedPromo
                ? Math.round(newSubtotalMinor * feeRate)
                : booking.service_fee_amount;

              return (
                <dl className="mt-4 space-y-3">
                  {appliedPromo ? (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Original price</dt>
                        <dd className="font-medium text-foreground">
                          {fmt(originalGross)}
                        </dd>
                      </div>
                      <div className="flex justify-between text-sm">
                        <dt className="text-green-700">
                          Discount ({appliedPromo.code})
                        </dt>
                        <dd className="font-medium text-green-700">
                          −{fmt(discountMinor)}
                        </dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Course price</dt>
                      <dd className="font-medium text-foreground">
                        {fmt(originalGross)}
                      </dd>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between">
                    <dt className="text-foreground font-bold" style={display}>
                      Total Due
                    </dt>
                    <dd className="text-2xl font-bold text-foreground" style={display}>
                      {fmt(total)}
                    </dd>
                  </div>
                  <p className="text-xs text-muted-foreground text-left">
                    Includes Lemonaidely service fee ({feeLabel}): {fmt(fee)}. By enrolling in this course, you agree to our{" "}
                    <Link to="/terms-of-service" className="text-accent hover:underline">
                      Terms of Service
                    </Link>
                    .
                  </p>
                </dl>
              );
            })()}

            <Button
              className="mt-5 w-full text-base font-semibold"
              variant="info"
              size="lg"
              onClick={handlePay}
              disabled={paying || booking.status === "confirmed"}
            >
              {paying ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Redirecting to Stripe…
                </>
              ) : booking.status === "confirmed" ? (
                "Already confirmed"
              ) : (
                "Proceed to Payment"
              )}
            </Button>

            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" />
              Secure checkout powered by Stripe.
            </p>
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
        <Button variant="ghost" asChild>
          <Link to="/dashboard/messages">
            <ArrowLeft className="mr-1 size-4" /> Back
          </Link>
        </Button>
      </div>
    </header>
  );
}
