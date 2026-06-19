import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import {
  confirmBookingDraft,
  declineBooking,
  getBooking,
  type BookingDetail,
} from "@/lib/bookings.functions";
import { useProfileStore } from "@/stores/useProfileStore";
import { resolveViewerTimezone } from "@/lib/tz";
import { DualZoneTime } from "@/components/chat/DualZoneTime";

interface Props {
  bookingId: string;
  viewerId: string | undefined;
  onChanged?: () => void;
}

const STATUS_LABEL: Record<BookingDetail["status"], string> = {
  pending_offer: "Awaiting your response",
  pending_payment: "Awaiting payment",
  declined: "Declined",
  confirmed: "Confirmed",
  completed: "Completed",
};

export function CustomOfferCard({ bookingId, viewerId, onChanged }: Props) {
  const navigate = useNavigate();
  const display = useCurrencyStore((s) => s.currency);
  const profileTz = useProfileStore((s) => s.timezone);
  const viewerTz = resolveViewerTimezone(profileTz);
  const fetchBooking = useServerFn(getBooking);
  const decline = useServerFn(declineBooking);
  const confirm = useServerFn(confirmBookingDraft);

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [busy, setBusy] = useState<"none" | "decline" | "confirm">("none");

  useEffect(() => {
    let cancelled = false;
    fetchBooking({ data: { booking_id: bookingId } })
      .then((b) => {
        if (!cancelled) setBooking(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingId, fetchBooking]);

  if (!booking) {
    return (
      <div className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-info/30 bg-info/5 p-4 text-sm text-muted-foreground">
        Loading offer…
      </div>
    );
  }

  const isLearner = viewerId === booking.learner_id;
  const fmt = formatCurrency(
    convertMinor(booking.total_price, booking.currency as CurrencyCode, display),
    display,
  );

  async function handleDecline() {
    setBusy("decline");
    try {
      await decline({ data: { booking_id: bookingId } });
      toast.success("Offer declined.");
      const updated = await fetchBooking({ data: { booking_id: bookingId } });
      setBooking(updated);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not decline.");
    } finally {
      setBusy("none");
    }
  }

  async function handleConfirm() {
    setBusy("confirm");
    try {
      await confirm({ data: { booking_id: bookingId } });
      navigate({ to: "/booking-review", search: { bookingId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not continue.");
      setBusy("none");
    }
  }

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-info/30 bg-info/5 p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-info">
        <Sparkles className="size-4 shrink-0" />
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">Custom Trip</span>
      </div>

      {booking.course_title && (
        <p className="mt-2 min-w-0 whitespace-pre-wrap break-words text-base font-medium text-foreground [overflow-wrap:anywhere]">
          {booking.course_title}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {booking.slots.map((s) => (
          <div key={s.id} className="flex min-w-0 items-start gap-2 text-foreground">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <DualZoneTime
              utcIso={s.starts_at}
              viewerTz={viewerTz}
              otherTz={booking.author_timezone}
              viewerLabel="Your time"
              otherLabel={isLearner ? "Aide's time" : "Learner's time"}
              durationMinutes={s.duration_minutes}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-background/70 px-3 py-2">
        <span className="min-w-0 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">Deposit due now</span>
        <span className="min-w-0 break-words text-right text-lg font-semibold text-foreground [overflow-wrap:anywhere]">{fmt}</span>
      </div>

      {booking.status === "pending_offer" && isLearner ? (
        <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
          <Button
            variant="info"
            className="min-w-0 flex-1 whitespace-normal break-words text-base font-semibold [overflow-wrap:anywhere]"
            onClick={handleConfirm}
            disabled={busy !== "none"}
          >
            {busy === "confirm" && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirm &amp; Pay
          </Button>
          <Button
            variant="outline"
            className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere]"
            onClick={handleDecline}
            disabled={busy !== "none"}
          >
            {busy === "decline" && <Loader2 className="mr-2 size-4 animate-spin" />}
            Decline / Request Changes
          </Button>
        </div>
      ) : booking.status === "pending_offer" ? (
          <p className="mt-3 min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Waiting for {booking.learner_name} to respond.
        </p>
      ) : booking.status === "pending_payment" && isLearner ? (
        <Button
          variant="info"
          className="mt-3 min-w-0 w-full whitespace-normal break-words [overflow-wrap:anywhere]"
          onClick={() => navigate({ to: "/booking-review", search: { bookingId } })}
        >
          Continue to payment
        </Button>
      ) : booking.status === "confirmed" ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /> Confirmed
        </div>
      ) : (
        <div className="mt-3 text-sm text-muted-foreground">
          {STATUS_LABEL[booking.status]}
        </div>
      )}
    </div>
  );
}
