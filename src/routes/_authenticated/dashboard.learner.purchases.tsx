import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatCurrency } from "@/lib/format-currency";
import {
  listMyTripBookingsLearner,
  type TripBookingSummary,
} from "@/lib/trip-bookings.functions";
import { TripReceiptDialog } from "@/components/earnings/TripReceiptDialog";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

export const Route = createFileRoute(
  "/_authenticated/dashboard/learner/purchases",
)({
  head: () => ({ meta: [{ title: "Purchase History — FishTrippers" }] }),
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

function shortOrderNumber(id: string): string {
  return "#" + id.replace(/-/g, "").slice(-6).toUpperCase();
}

type Timeframe = "all" | "month" | "year";

function inTimeframe(iso: string, tf: Timeframe): boolean {
  if (tf === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  if (tf === "year") return d.getFullYear() === now.getFullYear();
  if (tf === "month")
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  return true;
}

function LearnerPurchases() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const fetchBookings = useServerFn(listMyTripBookingsLearner);
  const [selectedBooking, setSelectedBooking] =
    useState<TripBookingSummary | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["learner-purchase-history", user?.id],
    queryFn: () => fetchBookings(),
    enabled: !!user,
  });

  const rows = useMemo(() => {
    const all = (data ?? []).filter(
      (b) => b.status === "confirmed" || b.status === "completed",
    );
    const q = query.trim().toLowerCase();
    return all
      .filter((b) => inTimeframe(b.created_at, timeframe))
      .filter((b) => {
        if (!q) return true;
        const order = shortOrderNumber(b.id).toLowerCase();
        const title = (b.trip_title ?? "").toLowerCase();
        return order.includes(q) || title.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [data, timeframe, query]);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-12 print:hidden">
      <h1 className="text-3xl font-bold tracking-tight" style={display}>
        Purchase History
      </h1>
      <p className="mt-2 text-muted-foreground">
        Every paid trip — deposit collected online, balance settled at the
        dock when your captain marks the trip complete.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-56">
          <Select
            value={timeframe}
            onValueChange={(v) => setTimeframe(v as Timeframe)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Order # or Trip..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 w-full overflow-x-auto rounded-md border border-border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Date Paid</TableHead>
              <TableHead className="font-bold">Order #</TableHead>
              <TableHead className="font-bold">Trip Name</TableHead>
              <TableHead className="font-bold">Total Price</TableHead>
              <TableHead className="font-bold">Deposit Paid</TableHead>
              <TableHead className="font-bold">Dock Balance</TableHead>
              <TableHead className="font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                >
                  No purchases match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => {
                const currency = b.currency || "USD";
                const total = formatCurrency(
                  b.total_price_minor ?? 0,
                  currency,
                );
                const deposit = formatCurrency(b.deposit_minor ?? 0, currency);
                const balance = formatCurrency(
                  b.balance_due_minor ?? 0,
                  currency,
                );
                const isCompleted = b.status === "completed";
                return (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {fmtDate(b.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-foreground">
                      {shortOrderNumber(b.id)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {b.trip_title ?? "Trip"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {total}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {deposit}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col leading-tight">
                        <span
                          className={
                            isCompleted
                              ? "text-[10px] uppercase tracking-wide text-emerald-700"
                              : "text-[10px] uppercase tracking-wide text-amber-700"
                          }
                        >
                          {isCompleted ? "Paid at Dock" : "Due at Dock"}
                        </span>
                        <span
                          className={
                            isCompleted
                              ? "text-muted-foreground"
                              : "font-bold text-foreground"
                          }
                        >
                          {balance}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBooking(b)}
                      >
                        <Receipt className="mr-1 size-4" /> View Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TripReceiptDialog
        booking={selectedBooking}
        captainName={selectedBooking?.captain_name ?? "Your captain"}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      />
    </main>
  );
}
