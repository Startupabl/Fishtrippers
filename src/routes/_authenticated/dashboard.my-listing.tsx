import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  ExternalLink,
  Eye,
  MapPin,
  Anchor,
  Ship,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { getMyOperator } from "@/lib/operators.functions";
import { listMyTrips, deleteTrip } from "@/lib/trips.functions";
import {
  TripFormDialog,
  type TripEditorState,
} from "@/components/operator-onboarding/trips/TripFormDialog";
import { useOperatorRoleLabel } from "@/hooks/useHasActiveListing";
import { formatCurrency } from "@/lib/format-currency";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const LEAF = DESIGN_SYSTEM.colors.leafGreen;
const YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;

export const Route = createFileRoute("/_authenticated/dashboard/my-listing")({
  head: () => ({
    meta: [
      { title: "My Listing — Lemonaidely" },
      {
        name: "description",
        content: "Manage your captain or guide listing and trip packages.",
      },
    ],
  }),
  component: MyListingPage,
});

function ModerationBadge({
  moderation,
  note,
}: {
  moderation: string | null;
  note: string | null;
}) {
  if (moderation === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
        <CheckCircle2 className="size-3.5" /> Approved
      </span>
    );
  if (moderation === "rejected" || (note && note.trim().length > 0))
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
        <AlertTriangle className="size-3.5" /> Action Needed
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-yellow-900"
      style={{ backgroundColor: `${YELLOW}66` }}
    >
      <Clock className="size-3.5" /> Pending Review
    </span>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: "Published", cls: "bg-emerald-100 text-emerald-900" },
    draft: { label: "Draft", cls: "bg-slate-200 text-slate-800" },
    archived: { label: "Archived", cls: "bg-zinc-200 text-zinc-700" },
  };
  const m = map[status ?? "draft"] ?? map.draft;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function MyListingPage() {
  const { titleCase: roleLabel } = useOperatorRoleLabel();
  const qc = useQueryClient();

  const fetchOperator = useServerFn(getMyOperator);
  const fetchTrips = useServerFn(listMyTrips);
  const removeTrip = useServerFn(deleteTrip);

  const operatorQ = useQuery({
    queryKey: ["my-operator-full"],
    queryFn: () => fetchOperator(),
  });

  const tripsQ = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => fetchTrips(),
  });

  const operator = operatorQ.data?.operator ?? null;
  const vessel = operatorQ.data?.vessel ?? null;
  const trips = tripsQ.data?.trips ?? [];

  const [editing, setEditing] = useState<TripEditorState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeTrip({ data: { id } }),
    onSuccess: () => {
      toast.success("Trip deleted");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicHref = useMemo(() => {
    const op: any = operator;
    if (!op?.slug || !op?.primary_category) return null;
    return `/c/${op.primary_category}/${op.slug}`;
  }, [operator]);

  if (operatorQ.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8 py-10">
        <p className="text-sm text-muted-foreground">Loading your listing…</p>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8 py-16 text-center">
        <h1 className="text-3xl text-foreground" style={lora}>
          You don't have a listing yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first listing to start accepting bookings.
        </p>
        <Button
          asChild
          className="mt-6 gap-2 rounded-2xl text-white hover:opacity-90"
          style={{ backgroundColor: LEAF }}
        >
          <Link to="/mentor/create-path" search={{ new: true }}>
            <Plus className="size-4" /> List Your Trip
          </Link>
        </Button>
      </div>
    );
  }

  const op: any = operator;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8 py-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
            My {roleLabel} Listing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your listing details, trips, and visibility.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2 rounded-2xl">
            <Link to="/operator/preview">
              <Eye className="size-4" /> Preview
            </Link>
          </Button>
          {publicHref ? (
            <Button asChild variant="outline" className="gap-2 rounded-2xl">
              <a href={publicHref} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> View public page
              </a>
            </Button>
          ) : null}
          <Button
            asChild
            className="gap-2 rounded-2xl text-white hover:opacity-90"
            style={{ backgroundColor: LEAF }}
          >
            <Link to="/mentor/create-path">
              <Pencil className="size-4" /> Edit listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Listing summary card */}
      <Card className="mt-6 overflow-hidden rounded-2xl border-border/60">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          <div
            className="aspect-video w-full bg-muted md:aspect-auto md:h-full"
            style={
              op.cover_image_url
                ? {
                    backgroundImage: `url(${op.cover_image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { background: `linear-gradient(135deg, ${LEAF}22, ${YELLOW}44)` }
            }
          />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground" style={lora}>
                {op.display_name ?? "Untitled listing"}
              </h2>
              <StatusPill status={op.status} />
              <ModerationBadge
                moderation={op.moderation_status}
                note={op.moderation_note}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {op.listing_number ? <span>#{op.listing_number}</span> : null}
              {op.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {op.location}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Anchor className="size-3" />
                {op.business_type === "guide" ? "Guide" : "Captain / Charter"}
              </span>
            </div>
            {op.moderation_note ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <strong>Reviewer note:</strong> {op.moderation_note}
              </p>
            ) : null}
            {op.about ? (
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {op.about}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Vessel */}
      {vessel ? (
        <Card className="mt-6 rounded-2xl border-border/60 p-5">
          <div className="flex items-center gap-2">
            <Ship className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Vessel
            </h3>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {[vessel.manufacturer, vessel.model, vessel.year]
              .filter(Boolean)
              .join(" ") || "Vessel details on file"}
            {vessel.length_ft ? ` · ${vessel.length_ft} ft` : ""}
            {vessel.max_passenger_capacity
              ? ` · up to ${vessel.max_passenger_capacity} guests`
              : ""}
          </p>
        </Card>
      ) : null}

      {/* Trips */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trip Catalog
          </h2>
          <Button
            size="sm"
            className="gap-2 rounded-2xl text-white hover:opacity-90"
            style={{ backgroundColor: LEAF }}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Add trip
          </Button>
        </div>

        <Card className="mt-3 overflow-hidden rounded-2xl border-border/60">
          {trips.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No trips yet. Add your first trip to start taking bookings.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      {t.duration_minutes ? `${t.duration_minutes} min` : "—"}
                    </TableCell>
                    <TableCell>
                      {t.price_minor != null
                        ? formatCurrency(t.price_minor, t.currency ?? "USD")
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {t.departure_address ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing({
                              id: t.id,
                              title: t.title ?? "",
                              description: t.description ?? "",
                              duration_minutes: t.duration_minutes ?? null,
                              price_minor: t.price_minor ?? null,
                              template_key: t.template_key ?? null,
                              departure_address: t.departure_address ?? "",
                              departure_lat: t.departure_lat ?? null,
                              departure_lng: t.departure_lng ?? null,
                              departure_place_id: t.departure_place_id ?? null,
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPendingDelete(t.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>

      <TripFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Existing bookings are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
