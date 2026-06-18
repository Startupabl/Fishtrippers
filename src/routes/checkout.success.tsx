import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import confetti from "canvas-confetti";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useBookingsStore } from "@/stores/useBookingsStore";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { convertMinor } from "@/lib/currency";
import { formatCurrency } from "@/lib/format-currency";
import { displayMentorName } from "@/lib/mentor-display";
import { getOrderByCheckoutSession } from "@/lib/checkout.functions";
import { getBooking, type BookingDetail } from "@/lib/bookings.functions";
import { getOrderByNumber, type OrderSummary } from "@/lib/orders.functions";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

const searchSchema = z.object({
  bookingId: fallback(z.string(), "").default(""),
  booking_id: fallback(z.string(), "").default(""),
  session_id: fallback(z.string(), "").default(""),
  order_number: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/checkout/success")({
  validateSearch: zodValidator(searchSchema),
  component: SuccessPage,
});

function SuccessPage() {
  const { bookingId, booking_id, session_id, order_number } = Route.useSearch();
  const navigate = useNavigate();
  const fetchOrder = useServerFn(getOrderByCheckoutSession);
  const fetchBooking = useServerFn(getBooking);
  const fetchOrderByNumber = useServerFn(getOrderByNumber);
  const legacyBooking = useBookingsStore((s) => s.bookings[bookingId]);
  const currency = useCurrencyStore((s) => s.currency);

  const fired = useRef(false);
  const [confirmed, setConfirmed] = useState<BookingDetail | null>(null);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [waiting, setWaiting] = useState(Boolean(session_id || booking_id || bookingId));
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!order_number) return;
    fetchOrderByNumber({ data: { order_number } })
      .then(setOrder)
      .catch(() => {});
  }, [order_number, fetchOrderByNumber]);

  // Confetti once on mission-complete render
  useEffect(() => {
    if (!confirmed || fired.current) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    fired.current = true;
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 } });
  }, [confirmed]);

  // Poll for webhook confirmation. Booking flows also accept `bookingId` from
  // search params so we can poll even when Stripe didn't append session_id.
  useEffect(() => {
    const effectiveBookingId = booking_id || bookingId;
    if (!session_id && !effectiveBookingId) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          if (effectiveBookingId) {
            const b = await fetchBooking({ data: { booking_id: effectiveBookingId } });
            if (b.status === "confirmed" && !cancelled) {
              setConfirmed(b);
              setWaiting(false);
              return;
            }
          } else if (session_id) {
            const { order } = await fetchOrder({ data: { session_id } });
            if (order && !cancelled) {
              toast.success("Mission unlocked — let's begin!");
              navigate({ to: "/dashboard" });
              return;
            }
          }
        } catch {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) {
        setTimedOut(true);
        setWaiting(false);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [session_id, booking_id, bookingId, fetchOrder, fetchBooking, navigate]);

  // ---- Snapshotted order receipt (dev sim + future real-payment branch) ----
  if (order) {
    const fmt = (m: number) =>
      formatCurrency(
        convertMinor(m, order.currency as CurrencyCode, currency),
        currency,
      );
    const earliest = order.scheduled_time;
    const tz = order.mentor_timezone ?? undefined;
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-money/15 text-money">
              <CheckCircle2 className="size-9" />
            </div>
            <h1
              className="text-4xl text-foreground md:text-5xl"
              style={{ ...display, fontWeight: 800 }}
            >
              🎉 Payment Confirmed & Secure!
            </h1>
            <p className="mt-3 text-sm uppercase tracking-wide text-muted-foreground">
              Order {order.order_number}
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-lg font-bold text-foreground" style={display}>
              {order.snapshot_course_title ?? "Custom session"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              with {order.counterparty_name}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Sessions</dt>
              <dd className="text-right text-foreground">
                {order.snapshot_total_sessions ?? "—"}
                {order.snapshot_session_duration
                  ? ` × ${order.snapshot_session_duration} min`
                  : ""}
              </dd>
              <dt className="text-muted-foreground">First session</dt>
              <dd className="text-right text-foreground">
                {earliest
                  ? new Date(earliest).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: tz,
                      timeZoneName: "short",
                    })
                  : "TBD"}
              </dd>
              <dt className="font-bold text-foreground">Total paid</dt>
              <dd className="text-right text-xl font-bold text-foreground" style={display}>
                {fmt(order.total_paid_minor)}
              </dd>
            </dl>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="info" className="min-h-12 rounded-2xl">
              <Link to="/dashboard/learner">Go to Angler Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ---- Booking confirmed: celebration view ----
  if (confirmed) {
    const title = confirmed.course_title?.trim();
    const aide = confirmed.aide_name?.trim();
    const hasNames = Boolean(title && aide);
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-money/15 text-money">
              <CheckCircle2 className="size-9" />
            </div>
            <h1
              className="text-4xl text-foreground md:text-5xl"
              style={{ ...display, fontWeight: 800 }}
            >
              🎉 Congratulations!
            </h1>
            <p className="mt-4 text-lg text-foreground">
              {hasNames ? (
                <>
                  You have successfully enrolled in{" "}
                  <span className="font-bold">{title}</span> with{" "}
                  <span className="font-bold">{displayMentorName(aide!)}</span>.
                </>
              ) : (
                "You are officially enrolled and ready to start learning."
              )}
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" variant="info" className="min-h-12 rounded-2xl">
              <Link to="/dashboard/learner">Go to Angler Dashboard</Link>
            </Button>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" />
            We've emailed your receipt and calendar details.
          </p>
        </main>
      </div>
    );
  }


  // ---- Stripe-checkout return path (waiting/timeout) ----
  const isBookingFlow = Boolean(booking_id || bookingId);
  if (session_id || isBookingFlow) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
          {waiting ? (
            <>
              <Loader2 className="mb-4 size-8 animate-spin text-info" />
              <h1 className="text-3xl text-foreground" style={display}>
                Finalizing your booking…
              </h1>
              <p className="mt-2 text-muted-foreground">
                Payment received. We're reserving your seat.
              </p>
            </>
          ) : timedOut ? (
            <>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-money/15 text-money">
                <CheckCircle2 className="size-9" />
              </div>
              <h1
                className="text-4xl text-foreground md:text-5xl"
                style={{ ...display, fontWeight: 800 }}
              >
                🎉 Congratulations!
              </h1>
              <p className="mt-4 text-lg text-foreground">
                You are officially enrolled and ready to start learning.
              </p>
              <Button asChild size="lg" variant="info" className="mt-6 min-h-12 rounded-2xl">
                <Link to="/dashboard/learner">Go to Angler Dashboard</Link>
              </Button>
            </>
          ) : null}
        </main>
      </div>
    );
  }

  // ---- Legacy mock-checkout path ----
  if (!legacyBooking) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader />
        <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="text-3xl text-foreground" style={display}>
            Booking not found
          </h1>
          <p className="mt-2 text-muted-foreground">
            We couldn't find that booking. It may have been cleared from this browser.
          </p>
          <Button asChild className="mt-6 min-h-12 rounded-2xl">
            <Link to="/">Back to home</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <div className="text-center">
          <h1
            className="text-4xl text-foreground md:text-5xl"
            style={{ ...display, fontWeight: 800 }}
          >
            You're all set!
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Your Guide is excited to meet you.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            with {displayMentorName(legacyBooking.mentorName)}
          </p>
          <Button asChild className="mt-6 min-h-12 rounded-2xl">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="border-b border-border/60 bg-card/60">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-4">
        <Logo size="md" />
      </div>
    </header>
  );
}
