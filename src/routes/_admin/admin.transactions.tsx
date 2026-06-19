import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";
import { Search, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { listAdminTransactions } from "@/lib/admin.functions";
import { formatCurrency } from "@/lib/format-currency";
import { usePlatformFee } from "@/hooks/usePlatformFee";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  dateRange: fallback(
    z.enum(["all", "today", "week", "month", "custom"]),
    "all",
  ).default("all"),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  sort: fallback(
    z.enum(["date-desc", "date-asc", "gross-desc"]),
    "date-desc",
  ).default("date-desc"),
});

export const Route = createFileRoute("/_admin/admin/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Admin" }] }),
  validateSearch: zodValidator(searchSchema),
  component: TransactionsPage,
});

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function computeRange(
  preset: "all" | "today" | "week" | "month" | "custom",
  from: string,
  to: string,
): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (preset === "today") return { start: startOfDay(now), end: endOfDay(now) };
  if (preset === "week")
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
  if (preset === "month") return { start: startOfMonth(now), end: endOfDay(now) };
  if (preset === "custom") {
    return {
      start: from ? startOfDay(new Date(from)) : null,
      end: to ? endOfDay(new Date(to)) : null,
    };
  }
  return { start: null, end: null };
}

function TransactionsPage() {
  const fetchTx = useServerFn(listAdminTransactions);
  const { label: feeLabel } = usePlatformFee();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "transactions"],
    queryFn: () => fetchTx(),
  });

  const { q, dateRange, from, to, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/transactions" });

  // Local debounced search input
  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) {
        navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, q: qInput }), replace: true });
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const rows = data ?? [];

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const { start, end } = computeRange(dateRange, from, to);

    const filtered = rows.filter((r) => {
      if (needle) {
        const hay = `${r.order_number ?? ""} ${r.learner_name} ${r.aide_name}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (start || end) {
        const ts = new Date(r.created_at).getTime();
        if (start && ts < start.getTime()) return false;
        if (end && ts > end.getTime()) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "date-desc") {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sort === "date-asc") {
      sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    } else if (sort === "gross-desc") {
      sorted.sort((a, b) => b.total_paid_minor - a.total_paid_minor);
    }
    return sorted;
  }, [rows, q, dateRange, from, to, sort]);

  const totals = useMemo(() => {
    const byCur = new Map<string, { gross: number; fee: number; payout: number }>();
    for (const r of filteredRows) {
      const cur = r.currency || "USD";
      const acc = byCur.get(cur) ?? { gross: 0, fee: 0, payout: 0 };
      acc.gross += r.total_paid_minor;
      acc.fee += r.platform_fee_minor;
      acc.payout += r.aide_payout_minor;
      byCur.set(cur, acc);
    }
    return Array.from(byCur.entries());
  }, [filteredRows]);

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Every paid order on the platform — gross, platform fee ({feeLabel}), and captain/guide payout.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Gross Total"
          values={totals.map(([cur, t]) => formatCurrency(t.gross, cur))}
        />
        <SummaryCard
          label="Captain/Guide Payouts"
          values={totals.map(([cur, t]) => formatCurrency(t.payout, cur))}
        />
        <SummaryCard
          label={`Earnings (${feeLabel})`}
          values={totals.map(([cur, t]) => formatCurrency(t.fee, cur))}
          accent
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search by Order #, Angler, or Captain/Guide"
            className="pl-9"
          />
        </div>

        <Select
          value={dateRange}
          onValueChange={(v) =>
            navigate({
              search: (prev: Record<string, unknown>) => ({
                ...prev,
                dateRange: v as typeof dateRange,
                ...(v !== "custom" ? { from: "", to: "" } : {}),
              }),
              replace: true,
            })
          }
        >
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === "custom" && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal md:w-[160px]",
                    !fromDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) =>
                    navigate({
                      search: (prev: Record<string, unknown>) => ({
                        ...prev,
                        from: d ? d.toISOString() : "",
                      }),
                      replace: true,
                    })
                  }
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal md:w-[160px]",
                    !toDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) =>
                    navigate({
                      search: (prev: Record<string, unknown>) => ({
                        ...prev,
                        to: d ? d.toISOString() : "",
                      }),
                      replace: true,
                    })
                  }
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <Select
          value={sort}
          onValueChange={(v) =>
            navigate({
              search: (prev: Record<string, unknown>) => ({ ...prev, sort: v as typeof sort }),
              replace: true,
            })
          }
        >
          <SelectTrigger className="md:w-[220px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Date (Newest First)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
            <SelectItem value="gross-desc">Gross Total (Highest First)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">
            All Transactions
            {filteredRows.length !== rows.length && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({filteredRows.length} of {rows.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Order Number</TableHead>
                <TableHead className="font-bold">Date &amp; Time</TableHead>
                <TableHead className="font-bold">Angler</TableHead>
                <TableHead className="font-bold">Captain/Guide</TableHead>
                <TableHead className="font-bold text-right">Gross Total</TableHead>
                <TableHead className="font-bold text-right">Payout Amount</TableHead>
                <TableHead className="font-bold text-right">Earnings ({feeLabel})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive py-10">
                    Failed to load transactions.
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    {rows.length === 0
                      ? "No transactions yet — once a learner pays, orders will appear here."
                      : "No transactions match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.order_number ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(r.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{r.learner_name}</TableCell>
                    <TableCell className="text-sm">{r.aide_name}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(r.total_paid_minor, r.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">
                      {formatCurrency(r.aide_payout_minor, r.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-money">
                      {formatCurrency(r.platform_fee_minor, r.currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  values,
  accent,
}: {
  label: string;
  values: string[];
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-money" : "text-foreground"}`}>
        {values.length === 0 ? "—" : values.join(" · ")}
      </div>
    </div>
  );
}
