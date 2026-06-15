import { Fragment } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Receipt,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { convertMinor } from "@/lib/currency";
import { formatCurrency } from "@/lib/format-currency";
import { listMyOrdersLearner, type OrderSummary } from "@/lib/orders.functions";
import { ReceiptDialog } from "@/components/earnings/ReceiptDialog";
import { OrderSchedulePanel } from "@/components/orders/OrderSchedulePanel";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

export const Route = createFileRoute(
  "/_authenticated/dashboard/learner/purchases",
)({
  head: () => ({ meta: [{ title: "Purchase History — Lemonaidely" }] }),
  component: LearnerPurchases,
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function LearnerPurchases() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listMyOrdersLearner);
  const currency = useCurrencyStore((s) => s.currency);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["learner-orders-count", user?.id],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  const history = useMemo(() => {
    const all = data ?? [];
    return [...all].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data]);


  if (!user) return null;

  const learnerName = user.displayName || user.firstName || user.email;

  return (
    <main className="mx-auto max-w-[1400px] px-4 md:px-8 py-12 print:hidden">
      <h1 className="text-3xl font-bold tracking-tight" style={display}>
        Purchase History
      </h1>
      <p className="mt-2 text-muted-foreground">
        Every booking and receipt — sorted newest to oldest. Expand any row to view sessions and add them to your calendar.
      </p>

      <div className="mt-6 w-full overflow-x-auto rounded-md border border-border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Order Number</TableHead>
              <TableHead className="font-bold">Course Title</TableHead>
              <TableHead className="font-bold">Instructor</TableHead>
              <TableHead className="font-bold">Schedule</TableHead>
              <TableHead className="font-bold">Amount Paid</TableHead>
              <TableHead className="font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Loading…
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No purchases yet.
                </TableCell>
              </TableRow>
            ) : (
              history.map((o) => {
                const paid = formatCurrency(
                  convertMinor(
                    o.total_paid_minor ?? 0,
                    o.currency as CurrencyCode,
                    currency,
                  ),
                  currency,
                );
                const expanded = expandedId === o.id;
                const sessions = o.total_sessions;
                const duration = o.snapshot_session_duration ?? 0;
                return (
                  <Fragment key={o.id}>
                    <TableRow>
                      <TableCell className="text-sm text-foreground whitespace-nowrap">
                        {fmtDate(o.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {o.order_number ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {o.snapshot_course_title ?? "Custom session"}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {o.counterparty_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground">
                        <div className="flex flex-col items-start gap-1">
                          <span>
                            {sessions} {sessions === 1 ? "Session" : "Sessions"} × {duration} mins
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              setExpandedId((cur) => (cur === o.id ? null : o.id))
                            }
                          >
                            <CalendarIcon className="mr-1 size-3.5" />
                            {expanded ? "Hide" : "View"}
                            {expanded ? (
                              <ChevronUp className="ml-1 size-3.5" />
                            ) : (
                              <ChevronDown className="ml-1 size-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-foreground">
                        {paid}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <Receipt className="mr-1 size-4" /> View Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-0">
                          <OrderSchedulePanel order={o} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ReceiptDialog
        order={selectedOrder}
        aideName={selectedOrder?.counterparty_name ?? learnerName}
        viewerRole="learner"
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
    </main>
  );
}
