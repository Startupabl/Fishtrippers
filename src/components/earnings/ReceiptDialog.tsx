import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format-currency";
import type { OrderSummary } from "@/lib/orders.functions";

interface ReceiptDialogProps {
  order: OrderSummary | null;
  aideName: string;
  onOpenChange: (open: boolean) => void;
  viewerRole?: "aide" | "learner";
}

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "N/A";
  }
}

export function ReceiptDialog({ order, aideName, onOpenChange, viewerRole = "aide" }: ReceiptDialogProps) {
  const isLearner = viewerRole === "learner";
  const open = !!order;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-2 print:hidden">
          <DialogTitle style={display}>Transaction Receipt</DialogTitle>
        </DialogHeader>

        {order && (
          <>
            <div className="px-6 pb-3 flex justify-end print:hidden">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 size-4" />
                Print / Save as PDF
              </Button>
            </div>

            <div id="receipt-printable" className="px-6 pb-6">
              <div className="border border-border rounded-lg p-6 bg-card">
                {/* Header */}
                <div className="border-b border-border pb-4 mb-4">
                  <div className="text-2xl font-bold text-foreground" style={display}>
                    FishTrippers
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Transaction Receipt
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Issued: {fmtDate(order.created_at)}
                  </div>
                </div>

                {/* Transaction Details */}
                <section className="mb-5">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Transaction Details
                  </h3>
                  <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Order Number</dt>
                    <dd className="font-medium text-foreground">{fmt(order.order_number)}</dd>
                    <dt className="text-muted-foreground">Course / Service</dt>
                    <dd className="font-medium text-foreground">
                      {fmt(order.snapshot_course_title)}
                    </dd>
                    <dt className="text-muted-foreground">Scheduled</dt>
                    <dd className="font-medium text-foreground">
                      {fmtDate(order.scheduled_time)}
                    </dd>
                  </dl>
                </section>

                {/* Parties */}
                <section className="mb-5">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Parties
                  </h3>
                  <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Instructor / Aide</dt>
                    <dd className="font-medium text-foreground">{fmt(aideName)}</dd>
                    <dt className="text-muted-foreground">Learner / Student</dt>
                    <dd className="font-medium text-foreground">
                      {fmt(order.counterparty_name)}
                    </dd>
                  </dl>
                </section>

                {/* Financial Summary */}
                <section>
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Financial Summary
                  </h3>
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="flex justify-between px-4 py-2.5 text-sm border-b border-border">
                      <span className="text-muted-foreground">Gross Subtotal</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(order.total_paid_minor ?? 0, order.currency)}
                      </span>
                    </div>
                    {!isLearner && (
                      <div className="flex justify-between px-4 py-2.5 text-sm border-b border-border">
                        <span className="text-muted-foreground">Platform Fee</span>
                        <span className="font-medium text-foreground">
                          −{formatCurrency(order.platform_fee_minor ?? 0, order.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-3 text-base bg-muted/40">
                      <span className="font-bold text-foreground">
                        {isLearner ? "Total Paid" : "Total Money Earned"}
                      </span>
                      <span className="font-bold text-money" style={display}>
                        {formatCurrency(
                          (isLearner ? order.total_paid_minor : order.aide_payout_minor) ?? 0,
                          order.currency,
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Amounts shown in {order.currency}.
                    {!isLearner && " Payouts settle to the Aide's connected account at the time of the transaction."}
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
