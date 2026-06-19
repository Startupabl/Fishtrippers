import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import type { TripBookingSummary } from "@/lib/trip-bookings.functions";

interface TripReceiptDialogProps {
  booking: TripBookingSummary | null;
  captainName: string;
  onOpenChange: (open: boolean) => void;
}

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

function shortOrderNumber(id: string): string {
  return "#" + id.replace(/-/g, "").slice(-6).toUpperCase();
}

export function TripReceiptDialog({
  booking,
  captainName,
  onOpenChange,
}: TripReceiptDialogProps) {
  const open = !!booking;
  const tripType =
    booking?.source === "custom_offer" ? "Custom Offer" : "Instant Book";
  const viewerCurrency = useCurrencyStore((s) => s.currency);
  const sourceCurrency = (booking?.currency as CurrencyCode) ?? "USD";
  const total = convertMinor(booking?.total_price_minor ?? 0, sourceCurrency, viewerCurrency);
  const deposit = convertMinor(booking?.deposit_minor ?? 0, sourceCurrency, viewerCurrency);
  const balance = convertMinor(booking?.balance_due_minor ?? 0, sourceCurrency, viewerCurrency);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-2 print:hidden">
          <DialogTitle style={display}>Trip Receipt</DialogTitle>
        </DialogHeader>

        {booking && (
          <>
            <div className="px-6 pb-3 flex justify-end print:hidden">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 size-4" />
                Print Receipt
              </Button>
            </div>

            <div id="receipt-printable" className="px-6 pb-6">
              <div className="border border-border rounded-lg p-6 bg-card">
                <div className="border-b border-border pb-4 mb-4">
                  <div
                    className="text-2xl font-bold text-foreground"
                    style={display}
                  >
                    FishTrippers
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Trip Receipt
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Issued: {fmtDate(booking.created_at)}
                  </div>
                </div>

                <section className="mb-5">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Trip Details
                  </h3>
                  <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Order Number</dt>
                    <dd className="font-medium text-foreground">
                      {shortOrderNumber(booking.id)}
                    </dd>
                    <dt className="text-muted-foreground">Trip</dt>
                    <dd className="font-medium text-foreground">
                      {fmt(booking.trip_title)} ({tripType})
                    </dd>
                    <dt className="text-muted-foreground">Trip Date</dt>
                    <dd className="font-medium text-foreground">
                      {fmtDate(booking.trip_date)}
                    </dd>
                    <dt className="text-muted-foreground">Guests</dt>
                    <dd className="font-medium text-foreground">
                      {fmt(booking.guests)}
                    </dd>
                  </dl>
                </section>

                <section className="mb-5">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Parties
                  </h3>
                  <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Captain</dt>
                    <dd className="font-medium text-foreground">
                      {fmt(captainName)}
                    </dd>
                    <dt className="text-muted-foreground">Angler</dt>
                    <dd className="font-medium text-foreground">
                      {fmt(booking.primary_angler_name ?? booking.learner_name)}
                    </dd>
                    {booking.phone && (
                      <>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium text-foreground">
                          {booking.phone}
                        </dd>
                      </>
                    )}
                  </dl>
                </section>

                <section>
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Financial Summary
                  </h3>
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="flex justify-between px-4 py-2.5 text-sm border-b border-border">
                        <span className="text-muted-foreground">
                          Total Trip Price
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(total, viewerCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 text-sm border-b border-border">
                        <span className="text-muted-foreground">
                          LESS: Fishtrippers Deposit
                        </span>
                        <span className="font-medium text-foreground">
                          −{formatCurrency(deposit, viewerCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-3 text-base bg-muted/40">
                        <span className="font-bold text-foreground">
                          Balance to Collect at Meeting
                        </span>
                        <span className="font-bold text-money" style={display}>
                          {formatCurrency(balance, viewerCurrency)}
                        </span>
                      </div>
                    </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    Payment is collected directly from the angler in person at
                    the time of the meeting.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
