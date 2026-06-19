import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search as SearchIcon, CalendarClock } from "lucide-react";
import {
  listAvailabilityHolds,
  releaseAvailabilityHold,
  type AvailabilityRow,
} from "@/lib/admin-availability.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/availability")({
  component: AvailabilityManagerPage,
});

function formatTripDateTime(iso: string | null, tz: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz || "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d) + (tz ? ` (${tz})` : " (UTC)");
  } catch {
    return d.toLocaleString();
  }
}

function formatCountdown(expiresAt: string | null, nowMs: number): string {
  if (!expiresAt) return "N/A";
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (ms <= 0) return "Expired";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `Expires in ${days}d ${hours}h`;
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

function StatusBadge({ status }: { status: AvailabilityRow["status"] }) {
  const label = status.toUpperCase();
  const cls =
    status === "booked"
      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
      : status === "held"
      ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
      : "bg-slate-200 text-slate-800 hover:bg-slate-200";
  return <Badge className={cls} variant="secondary">{label}</Badge>;
}

function AvailabilityManagerPage() {
  const listFn = useServerFn(listAvailabilityHolds);
  const releaseFn = useServerFn(releaseAvailabilityHold);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "availability"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  const release = useMutation({
    mutationFn: (id: string) => releaseFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Hold released — captain's calendar is open again.");
      qc.invalidateQueries({ queryKey: ["admin", "availability"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to release hold"),
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.captainName.toLowerCase().includes(q) ||
        r.tripType.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarClock className="h-6 w-6 text-slate-700" />
        <div>
          <h1 className="text-2xl font-semibold">Calendar Availability & Hold Logs</h1>
          <p className="text-sm text-muted-foreground">
            Active calendar allocations (today and future). Expired custom-trip holds are hidden.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by captain name or trip type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Captain Name</TableHead>
              <TableHead>Trip Type</TableHead>
              <TableHead>Trip Date & Time</TableHead>
              <TableHead>Block Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiration / Countdown</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Loading availability…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No active allocations match.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.captainName}</TableCell>
                  <TableCell>{r.tripType}</TableCell>
                  <TableCell>{formatTripDateTime(r.tripDateTimeISO, r.captainTimezone)}</TableCell>
                  <TableCell>{r.blockReason}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>
                    {r.status === "held" ? formatCountdown(r.offerExpiresAt, nowMs) : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "held" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={release.isPending}>
                            Release Hold
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Release this hold?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will free {r.captainName}'s calendar for{" "}
                              {formatTripDateTime(r.tripDateTimeISO, r.captainTimezone)} and cancel
                              the pending custom trip offer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => release.mutate(r.id)}>
                              Release Hold
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
