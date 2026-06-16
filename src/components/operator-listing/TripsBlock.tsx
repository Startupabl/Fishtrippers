import { Clock, Info, Plus, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";

interface Trip {
  id: string;
  title: string;
  description?: string | null;
  duration_minutes: number;
  price_minor: number;
  currency: string;
}

interface Props {
  trips: Trip[];
}

function formatDuration(mins: number) {
  if (mins >= 60 * 12) return "Overnight";
  const h = Math.round(mins / 60);
  return `${h} hour trip`;
}

export function TripsBlock({ trips }: Props) {
  return (
    <section id="trips" className="scroll-mt-32 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Trip availability and prices</h2>

      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          <span className="font-semibold underline">Free cancellation</span> per captain&apos;s policy.
        </span>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <h3 className="text-lg font-semibold">No trips added yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first trip so guests can book.
          </p>
          <Button asChild className="mt-4">
            <Link to="/mentor/create-path">
              <Plus className="mr-1 h-4 w-4" /> Add a trip
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-semibold underline-offset-2 hover:underline">
                    {t.title}
                  </h3>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDuration(t.duration_minutes)}
                  </span>
                </div>
                {t.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-700">
                    {formatCurrency(t.price_minor, (t.currency as any) || "USD")}
                  </div>
                  <div className="text-xs text-muted-foreground">per group</div>
                </div>
                <Button className="bg-gold text-ocean-deep hover:bg-gold-deep">
                  View availability
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
