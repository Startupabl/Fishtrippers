import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Pencil, Plus, Trash2, Ship, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listMyTrips, deleteTrip } from "@/lib/trips.functions";
import { TRIP_TEMPLATES, DURATION_OPTIONS } from "@/lib/trips.shared";
import { useOperatorOnboardingStore } from "@/stores/useOperatorOnboardingStore";
import { TripFormDialog, type TripEditorState } from "../trips/TripFormDialog";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

function formatDuration(mins: number): string {
  const match = DURATION_OPTIONS.find((o) => o.value === mins);
  if (match) return match.label;
  if (mins >= 60) return `${Math.round(mins / 60)}h`;
  return `${mins}m`;
}

function formatPrice(minor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function TripCatalogStep({ onBack, onNext }: Props) {
  const primary_category = useOperatorOnboardingStore((s) => s.primary_category);
  const setStep = useOperatorOnboardingStore((s) => s.setStep);
  const defaultDeparture = useOperatorOnboardingStore((s) => s.default_departure);
  const listFn = useServerFn(listMyTrips);
  const deleteFn = useServerFn(deleteTrip);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TripEditorState | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => listFn(),
  });
  const trips = data?.trips ?? [];

  const templates = useMemo(
    () => (primary_category ? TRIP_TEMPLATES[primary_category] : []),
    [primary_category],
  );

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Trip removed");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete trip"),
  });

  const openCreate = (preset?: { title: string; duration: number; key: string }) => {
    setEditing({
      id: null,
      title: preset?.title ?? "",
      description: "",
      start_time: "",
      duration_minutes: preset?.duration ?? null,
      price_minor: null,
      per_extra_minor: 0,
      min_party_size: 1,
      max_party_size: null,
      template_key: preset?.key ?? null,
      booking_type: "request_to_book",
      charter_type: "private_charter",
      seats_available: null,

      target_species: [],
      environments: [],
      techniques: [],
      departure_address: defaultDeparture.address ?? "",
      departure_lat: defaultDeparture.lat ?? null,
      departure_lng: defaultDeparture.lng ?? null,
      departure_place_id: defaultDeparture.place_id ?? null,
    });
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      start_time: t.start_time ? String(t.start_time).slice(0, 5) : "",
      duration_minutes: t.duration_minutes,
      price_minor: t.price_minor,
      per_extra_minor: t.per_extra_minor ?? 0,
      min_party_size: t.min_party_size ?? 1,
      max_party_size: t.max_party_size ?? null,
      template_key: t.template_key ?? null,
      booking_type: t.booking_type ?? "request_to_book",
      charter_type: t.charter_type ?? "private_charter",
      seats_available: t.seats_available ?? null,

      target_species: Array.isArray(t.target_species) ? t.target_species : [],
      environments: Array.isArray(t.environments) ? t.environments : [],
      techniques: Array.isArray(t.techniques) ? t.techniques : [],
      departure_address: t.departure_address ?? "",
      departure_lat: t.departure_lat ?? null,
      departure_lng: t.departure_lng ?? null,
      departure_place_id: t.departure_place_id ?? null,
    });
    setOpen(true);
  };

  if (!primary_category) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Trip catalog</h1>
          <p className="mt-2 text-muted-foreground">
            Pick a primary fishing focus first so we can suggest the right trip templates.
          </p>
        </header>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          <div className="flex-1 text-sm">
            Finish the Fishing Focus step to unlock tailored templates.
          </div>
          <Button variant="outline" size="sm" onClick={() => setStep("fishing_focus")}>
            Go back
          </Button>
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Build your trip catalog</h1>
        <p className="mt-2 text-muted-foreground">
          Start from a template tailored to your focus, or build a custom trip from scratch. You
          need at least one trip to continue.
        </p>
      </header>

      {trips.length === 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Templates for {primary_category}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {templates.map((tpl) => (
              <button
                key={tpl.key}
                type="button"
                onClick={() =>
                  openCreate({
                    title: tpl.title,
                    duration: tpl.defaultDurationMinutes,
                    key: tpl.key,
                  })
                }
                className="group flex h-full flex-col gap-3 rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <Ship className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">
                    {formatDuration(tpl.defaultDurationMinutes)}
                  </Badge>
                </div>
                <div>
                  <div className="font-semibold">{tpl.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{tpl.blurb}</p>
                </div>
                <span className="mt-auto text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Use template →
                </span>
              </button>
            ))}
          </div>
          <div className="pt-2">
            <Button variant="outline" onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" /> Create custom trip from scratch
            </Button>
          </div>
        </section>
      )}

      {trips.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your trips ({trips.length})
          </h2>
          <ul className="space-y-3">
            {trips.map((t: any) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.title}</span>
                    <Badge variant="secondary">{formatDuration(t.duration_minutes)}</Badge>
                    <Badge variant="outline">{formatPrice(t.price_minor)}</Badge>
                  </div>
                  {t.departure_address && (
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">{t.departure_address}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${t.title}"?`)) del.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Button variant="outline" onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" /> Add another trip
            </Button>
          </div>
        </section>
      )}

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading your trips…</div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={trips.length === 0} size="lg">
          Continue
        </Button>
      </div>

      <TripFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </div>
  );
}
