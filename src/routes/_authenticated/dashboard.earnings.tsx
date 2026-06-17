import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { convertMinor } from "@/lib/currency";
import { formatCurrency } from "@/lib/format-currency";
import { usePlatformFee } from "@/hooks/usePlatformFee";
import {
  listMyOrdersAide,
  type OrderSummary,
} from "@/lib/orders.functions";
import { ReceiptDialog } from "@/components/earnings/ReceiptDialog";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

type Timeframe = "all" | "this_month" | "last_month" | "this_year";
type SortDir = "asc" | "desc";

export const Route = createFileRoute("/_authenticated/dashboard/earnings")({
  head: () => ({ meta: [{ title: "My Earnings — FishTrippers" }] }),
  component: EarningsPage,
});

function timeframeBounds(tf: Timeframe): { start: Date; end: Date } | null {
  if (tf === "all") return null;
  const now = new Date();
  if (tf === "this_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  if (tf === "last_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  // this_year
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear() + 1, 0, 1),
  };
}

function EarningsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listMyOrdersAide);
  const currency = useCurrencyStore((s) => s.currency);
  const { label: feeLabel } = usePlatformFee();
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders-aide", user?.id],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  const orders = data ?? [];

  const totals = useMemo(() => {
    let payout = 0;
    let fees = 0;
    let gross = 0;
    for (const o of orders) {
      const cur = (o.currency as CurrencyCode) ?? currency;
      payout += convertMinor(o.aide_payout_minor, cur, currency);
      fees += convertMinor(o.platform_fee_minor, cur, currency);
      gross += convertMinor(o.total_paid_minor, cur, currency);
    }
    return { payout, fees, gross };
  }, [orders, currency]);

  const courseOptions = useMemo(() => {
    const titles = new Set<string>();
    for (const o of orders) {
      if (o.snapshot_course_title) titles.add(o.snapshot_course_title);
    }
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const bounds = timeframeBounds(timeframe);
    let rows = orders;
    if (bounds) {
      rows = rows.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= bounds.start.getTime() && t < bounds.end.getTime();
      });
    }
    if (courseFilter !== "all") {
      rows = rows.filter((o) => o.snapshot_course_title === courseFilter);
    }
    const sorted = [...rows].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
    return sorted;
  }, [orders, timeframe, courseFilter, sortDir]);

  if (!user) return null;

  const aideName = user.displayName || user.firstName || user.email;

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-12 print:hidden">
      <h1 className="text-3xl font-bold tracking-tight" style={display}>
        My Earnings
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your financial performance — payouts settle to your account at the time of booking.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total Revenue Earned" value={formatCurrency(totals.payout, currency)} accent />
        <SummaryCard label="Gross" value={formatCurrency(totals.gross, currency)} />
        <SummaryCard
          label={`Platform fee (${feeLabel})`}
          value={`−${formatCurrency(totals.fees, currency)}`}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Timeframe
          </span>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Course
          </span>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courseOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 w-full overflow-x-auto rounded-md border border-border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                >
                  Date
                  {sortDir === "desc" ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUp className="size-3.5" />
                  )}
                </button>
              </TableHead>
              <TableHead className="font-bold">Order Number</TableHead>
              <TableHead className="font-bold">Course Title</TableHead>
              <TableHead className="font-bold">Student</TableHead>
              <TableHead className="font-bold">Money Earned</TableHead>
              <TableHead className="font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Loading…
                </TableCell>
              </TableRow>
            ) : visibleOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  {orders.length === 0
                    ? "No earnings yet — once a learner pays, the ledger will populate here."
                    : "No orders match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              visibleOrders.map((o) => (
                <EarningsRow
                  key={o.id}
                  order={o}
                  viewerCurrency={currency}
                  onViewReceipt={() => setSelectedOrder(o)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReceiptDialog
        order={selectedOrder}
        aideName={aideName}
        onOpenChange={(open: boolean) => !open && setSelectedOrder(null)}
      />
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${accent ? "text-money" : "text-foreground"}`}
        style={display}
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
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

function EarningsRow({
  order,
  viewerCurrency,
  onViewReceipt,
}: {
  order: OrderSummary;
  viewerCurrency: CurrencyCode;
  onViewReceipt: () => void;
}) {
  const payout = formatCurrency(
    convertMinor(
      order.aide_payout_minor,
      order.currency as CurrencyCode,
      viewerCurrency,
    ),
    viewerCurrency,
  );

  return (
    <TableRow>
      <TableCell className="text-sm text-foreground whitespace-nowrap">
        {formatDate(order.created_at)}
      </TableCell>
      <TableCell className="text-sm text-foreground">{order.order_number}</TableCell>
      <TableCell className="text-sm font-medium text-foreground">
        {order.snapshot_course_title ?? "Custom session"}
      </TableCell>
      <TableCell className="text-sm text-foreground">
        <span className="truncate">{order.counterparty_name}</span>
      </TableCell>
      <TableCell className="text-sm font-bold text-money">{payout}</TableCell>
      <TableCell className="text-sm text-foreground">
        <Button size="sm" variant="outline" onClick={onViewReceipt}>
          <Receipt className="mr-1 size-4" /> Receipt
        </Button>
      </TableCell>
    </TableRow>
  );
}
