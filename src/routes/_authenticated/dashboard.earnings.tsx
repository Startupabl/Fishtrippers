import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  listMyTripBookingsAide,
  type TripBookingSummary,
} from "@/lib/trip-bookings.functions";
import { TripReceiptDialog } from "@/components/earnings/TripReceiptDialog";

const display = { fontFamily: "Montserrat, system-ui, sans-serif" };

type Timeframe = "all" | "this_month" | "this_year" | "last_12_months";
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
  if (tf === "this_year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear() + 1, 0, 1),
    };
  }
  // last_12_months
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  return { start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) };
}

function shortOrderNumber(id: string): string {
  return "#" + id.replace(/-/g, "").slice(-6).toUpperCase();
}

function formatDate(iso: string | null): string {
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

function EarningsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const currency = useCurrencyStore((s) => s.currency);
  const fetchTripBookings = useServerFn(listMyTripBookingsAide);

  const [selectedBooking, setSelectedBooking] =
    useState<TripBookingSummary | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-trip-bookings-aide", user?.id],
    queryFn: () => fetchTripBookings(),
    enabled: !!user,
  });

  const bookings = useMemo(
    () =>
      (data ?? []).filter(
        (b) => b.status === "completed" || b.status === "confirmed",
      ),
    [data],
  );

  const totals = useMemo(() => {
    let completedEarnings = 0;
    let projectedEarnings = 0;
    let tripsRun = 0;
    const todayIso = new Date().toISOString().slice(0, 10);
    for (const b of bookings) {
      const cur = (b.currency as CurrencyCode) ?? currency;
      const balance = convertMinor(b.balance_due_minor ?? 0, cur, currency);
      if (b.status === "completed") {
        completedEarnings += balance;
        tripsRun += 1;
      } else if (b.status === "confirmed") {
        if (!b.trip_date || b.trip_date >= todayIso) {
          projectedEarnings += balance;
        }
      }
    }
    return { completedEarnings, projectedEarnings, tripsRun };
  }, [bookings, currency]);

  const visibleRows = useMemo(() => {
    const bounds = timeframeBounds(timeframe);
    const q = search.trim().toLowerCase();
    let rows = bookings;
    if (bounds) {
      rows = rows.filter((b) => {
        const iso = b.trip_date ?? b.created_at;
        const t = new Date(iso).getTime();
        return t >= bounds.start.getTime() && t < bounds.end.getTime();
      });
    }
    if (q) {
      rows = rows.filter((b) => {
        const orderNum = shortOrderNumber(b.id).toLowerCase();
        const angler = (b.primary_angler_name ?? b.learner_name ?? "").toLowerCase();
        const title = (b.trip_title ?? "").toLowerCase();
        return (
          orderNum.includes(q) || angler.includes(q) || title.includes(q)
        );
      });
    }
    return [...rows].sort((a, b) => {
      const ta = new Date(a.trip_date ?? a.created_at).getTime();
      const tb = new Date(b.trip_date ?? b.created_at).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [bookings, timeframe, search, sortDir]);

  if (!user) return null;

  const captainName = user.displayName || user.firstName || user.email;

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-12 print:hidden">
      <h1 className="text-3xl font-bold tracking-tight" style={display}>
        My Earnings
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your financial performance — the deposit covers the platform fee; the
        remaining balance is collected at the dock.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Completed Earnings"
          value={formatCurrency(totals.completedEarnings, currency)}
          accent="money"
        />
        <SummaryCard
          label="Projected Earnings"
          value={formatCurrency(totals.projectedEarnings, currency)}
          accent="gold"
        />
        <SummaryCard label="Trips Run" value={String(totals.tripsRun)} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Timeframe
          </span>
          <Select
            value={timeframe}
            onValueChange={(v) => setTimeframe(v as Timeframe)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_12_months">Past 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order #, Angler, or Trip..."
            className="pl-9"
          />
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
                  onClick={() =>
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                  }
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
              <TableHead className="font-bold">Trip Title</TableHead>
              <TableHead className="font-bold">Angler</TableHead>
              <TableHead className="font-bold">Money Earned</TableHead>
              <TableHead className="font-bold">Status</TableHead>
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
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                >
                  {bookings.length === 0
                    ? "No trip earnings yet — once a trip is booked, it will show up here."
                    : "No trips match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((b) => (
                <EarningsRow
                  key={b.id}
                  booking={b}
                  viewerCurrency={currency}
                  onViewReceipt={() => setSelectedBooking(b)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TripReceiptDialog
        booking={selectedBooking}
        captainName={captainName}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
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
  accent?: "money" | "gold";
}) {
  const tone =
    accent === "money"
      ? "text-money"
      : accent === "gold"
        ? "text-accent-foreground"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${tone}`} style={display}>
        {value}
      </div>
    </div>
  );
}

function EarningsRow({
  booking,
  viewerCurrency,
  onViewReceipt,
}: {
  booking: TripBookingSummary;
  viewerCurrency: CurrencyCode;
  onViewReceipt: () => void;
}) {
  const earned = formatCurrency(
    convertMinor(
      booking.balance_due_minor ?? 0,
      booking.currency as CurrencyCode,
      viewerCurrency,
    ),
    viewerCurrency,
  );
  const tripType =
    booking.source === "custom_offer" ? "Custom Offer" : "Instant Book";
  const isCompleted = booking.status === "completed";
  const angler = booking.primary_angler_name ?? booking.learner_name ?? "—";

  return (
    <TableRow>
      <TableCell className="text-sm text-foreground whitespace-nowrap">
        {formatDate(booking.trip_date ?? booking.created_at)}
      </TableCell>
      <TableCell className="text-sm text-foreground">
        {shortOrderNumber(booking.id)}
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground">
        {booking.trip_title ?? "Trip"}{" "}
        <span className="text-muted-foreground">({tripType})</span>
      </TableCell>
      <TableCell className="text-sm text-foreground">
        <span className="truncate">{angler}</span>
      </TableCell>
      <TableCell className="text-sm font-bold text-money">{earned}</TableCell>
      <TableCell className="text-sm">
        {isCompleted ? (
          <Badge className="bg-money text-money-foreground hover:bg-money">
            Completed
          </Badge>
        ) : (
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">
            Projected
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-foreground">
        <Button size="sm" variant="outline" onClick={onViewReceipt}>
          <Receipt className="mr-1 size-4" /> View Receipt
        </Button>
      </TableCell>
    </TableRow>
  );
}
