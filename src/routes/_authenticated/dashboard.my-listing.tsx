import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  MoreHorizontal,
  CalendarDays,
  ShieldCheck,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { getMyOperator } from "@/lib/operators.functions";
import { listMyTrips, deleteTrip, setTripStatus, listUndersoldSharedTrips } from "@/lib/trips.functions";

import { listMyHostAvailability } from "@/lib/host-availability.functions";
import {
  TripFormDialog,
  type TripEditorState,
} from "@/components/operator-onboarding/trips/TripFormDialog";
import { ConnectPayoutsDialog } from "@/components/operator-onboarding/ConnectPayoutsDialog";
import { ReportListingDialog } from "@/components/listings/ReportListingDialog";
import { useOperatorRoleLabel } from "@/hooks/useHasActiveListing";
import { formatCurrency } from "@/lib/format-currency";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const LEAF = DESIGN_SYSTEM.colors.leafGreen;
const YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;

export const Route = createFileRoute("/_authenticated/dashboard/my-listing")({
  head: () => ({
    meta: [
      { title: "My Listing — FishTrippers" },
      {
        name: "description",
        content: "Manage your captain or guide listing and trip packages.",
      },
    ],
  }),
  component: MyListingPage,
});

function StatusBadge({
  status,
  moderation,
  moderationNote,
}: {
  status: string | null;
  moderation: string | null;
  moderationNote?: string | null;
}) {
  let label = "Draft";
  let cls = "text-yellow-900";
  let inlineStyle: React.CSSProperties | undefined = {
    backgroundColor: `${YELLOW}66`,
  };
  let Icon: any = Clock;

  if (moderationNote && moderationNote.trim().length > 0 && moderation !== "approved") {
    label = "Action Needed";
    cls = "bg-amber-100 text-amber-900";
    inlineStyle = undefined;
    Icon = AlertTriangle;
  } else if (status === "archived") {
    label = "Archived";
    cls = "bg-zinc-200 text-zinc-700";
    inlineStyle = undefined;
  } else if (moderation === "approved") {
    label = "Live";
    cls = "bg-emerald-100 text-emerald-800";
    inlineStyle = undefined;
    Icon = CheckCircle2;
  } else if (moderation === "rejected" || moderation === "declined") {
    label = "Declined";
    cls = "bg-red-100 text-red-700";
    inlineStyle = undefined;
    Icon = AlertTriangle;
  } else if (moderation === "pending") {
    label = "Pending Review";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}
      style={inlineStyle}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function formatDurationHours(mins: number | null): string {
  if (!mins) return "—";
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function MyListingPage() {
  const { titleCase: roleLabel } = useOperatorRoleLabel();
  const qc = useQueryClient();

  const fetchOperator = useServerFn(getMyOperator);
  const fetchTrips = useServerFn(listMyTrips);
  const removeTrip = useServerFn(deleteTrip);
  const updateTripStatus = useServerFn(setTripStatus);

  const operatorQ = useQuery({
    queryKey: ["my-operator-full"],
    queryFn: () => fetchOperator(),
  });

  const tripsQ = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => fetchTrips(),
  });


  const fetchAvail = useServerFn(listMyHostAvailability);
  const availQ = useQuery({
    queryKey: ["my-host-availability"],
    queryFn: () => fetchAvail(),
  });

  const fetchUndersold = useServerFn(listUndersoldSharedTrips);
  const undersoldQ = useQuery({
    queryKey: ["my-undersold-shared-trips"],
    queryFn: () => fetchUndersold(),
    refetchInterval: 5 * 60 * 1000,
  });

  const operator = operatorQ.data?.operator ?? null;
  const trips = tripsQ.data?.trips ?? [];
  
  const hasCalendarEntry = (availQ.data?.length ?? 0) > 0;
  const showCalendarBanner = trips.length > 0 && !hasCalendarEntry;
  const undersold = undersoldQ.data ?? [];

  const [editing, setEditing] = useState<TripEditorState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [payoutsOpen, setPayoutsOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeTrip({ data: { id } }),
    onSuccess: () => {
      toast.success("Trip deleted");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
      setPendingDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "draft" | "active" }) =>
      updateTripStatus({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "active" ? "Trip published" : "Trip unpublished");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publicHref = useMemo(() => {
    const op: any = operator;
    if (!op?.slug || !op?.location_slug) return null;
    return `/charters/${op.location_slug}/${op.slug}`;
  }, [operator]);


  if (operatorQ.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 py-10">
        <p className="text-sm text-muted-foreground">Loading your listing…</p>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl text-foreground" style={lora}>
          You don&apos;t have a listing yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first listing to start accepting bookings.
        </p>
        <Button
          asChild
          className="mt-6 gap-2 rounded-2xl text-white hover:opacity-90"
          style={{ backgroundColor: LEAF }}
        >
          <Link to="/create-listing/new" search={{ new: true }}>
            <Plus className="size-4" /> List Your Trip
          </Link>
        </Button>
      </div>
    );
  }

  const op: any = operator;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 py-8 md:py-10">
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
          <Button
            asChild
            className="gap-2 rounded-2xl text-white hover:opacity-90"
            style={{ backgroundColor: LEAF }}
          >
            <Link to="/create-listing/new" search={{ edit: true } as never}>
              <Pencil className="size-4" /> Edit listing
            </Link>
          </Button>
        </div>
      </div>


      {(() => {
        const needsAvailability = showCalendarBanner;
        const needsVerification =
          !!operator && (operator as any).verification_status !== "verified";
        if (!needsAvailability && !needsVerification) return null;
        return (
          <Card className="mt-4 rounded-2xl border-amber-200 bg-amber-50/60 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-amber-900">
                Pending Action Items
              </p>
              <p className="text-xs text-amber-900/80">
                Complete these to go live and build trust.
              </p>
            </div>
            <ul className="space-y-2">
              {needsAvailability ? (
                <li className="flex items-start gap-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Set your schedule and rates in{" "}
                    <Link
                      to="/dashboard/master-calendar"
                      className="font-medium underline underline-offset-2"
                    >
                      Manage Availability
                    </Link>
                    .
                  </span>
                </li>
              ) : null}
              {needsVerification ? (
                <li className="flex items-start gap-2 text-sm text-amber-900">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Upload your credentials in{" "}
                    <Link
                      to="/dashboard/verifications"
                      className="font-medium underline underline-offset-2"
                    >
                      My Verifications
                    </Link>{" "}
                    to earn your Verified badge.
                  </span>
                </li>
              ) : null}
            </ul>
          </Card>
        );
      })()}


      {undersold.length > 0 ? (
        <Card className="mt-4 rounded-2xl border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="size-4 text-amber-900" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Below minimum to sail
              </p>
              <p className="text-xs text-amber-900/80">
                These shared trips haven&apos;t hit your minimum yet. Contact
                guests to cancel/refund or decide to run them anyway.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-900">
                {undersold.map((u) => (
                  <li key={`${u.trip_id}-${u.trip_date}`}>
                    <span className="font-medium">{u.title}</span>
                    {" — "}
                    {u.trip_date} · {u.seats_booked}/{u.min_seats_to_sail} seats sold
                    {" ("}
                    {u.hours_to_departure}h to departure{")"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}



      {/* Listing table */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your Listing
        </h2>
        <Card className="mt-3 overflow-hidden rounded-2xl border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-16 shrink-0 rounded-md bg-muted"
                      style={
                        op.cover_image_url
                          ? {
                              backgroundImage: `url(${op.cover_image_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : {
                              background: `linear-gradient(135deg, ${LEAF}22, ${YELLOW}44)`,
                            }
                      }
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {op.display_name ?? "Untitled listing"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {op.listing_number ? `#${op.listing_number} · ` : ""}
                        {op.business_type === "guide" ? "Guide" : "Captain / Charter"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={op.status}
                    moderation={op.moderation_status}
                    moderationNote={op.moderation_note}
                  />
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">0</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatCurrency(0, "USD")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      title="Edit listing"
                    >
                      <Link to="/create-listing/new" search={{ edit: true } as never}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      title="Manage Availability"
                    >
                      <Link to="/dashboard/master-calendar">
                        <CalendarDays className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      title="Manage Policies"
                    >
                      <Link to="/dashboard/manage-policies">
                        <ShieldCheck className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      title="Preview"
                    >
                      <Link to="/operator/preview">
                        <Eye className="size-4" />
                      </Link>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" title="More">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {publicHref ? (
                          <DropdownMenuItem asChild>
                            <a href={publicHref} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 size-4" />
                              View public page
                            </a>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/create-listing/new" search={{ edit: true } as never}>
                            <Pencil className="mr-2 size-4" />
                            Edit listing
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/manage-policies">
                            <ShieldCheck className="mr-2 size-4" />
                            Manage Policies
                          </Link>
                        </DropdownMenuItem>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
        {op.moderation_note ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <strong>Reviewer note:</strong> {op.moderation_note}
          </p>
        ) : null}
      </section>

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
                  <TableHead>Start</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((t: any) => {
                  const startStr = t.start_time
                    ? String(t.start_time).slice(0, 5)
                    : "—";
                  return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground">{startStr}</TableCell>
                    <TableCell>{formatDurationHours(t.duration_minutes)}</TableCell>
                    <TableCell>
                      {t.price_minor != null
                        ? formatCurrency(t.price_minor, t.currency ?? "USD")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">

                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant={isActive ? "outline" : "default"}
                          disabled={statusMut.isPending}
                          onClick={() =>
                            statusMut.mutate({
                              id: t.id,
                              status: isActive ? "draft" : "active",
                            })
                          }
                        >
                          {isActive ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing({
                              id: t.id,
                              title: t.title ?? "",
                              description: t.description ?? "",
                              start_time: (t as any).start_time ? String((t as any).start_time).slice(0, 5) : "",
                              duration_minutes: t.duration_minutes ?? null,
                              price_minor: t.price_minor ?? null,
                              per_extra_minor: (t as any).per_extra_minor ?? 0,
                              min_party_size: (t as any).min_party_size ?? 1,
                              max_party_size: (t as any).max_party_size ?? null,
                              template_key: t.template_key ?? null,
                              booking_type: (t as any).booking_type ?? "request_to_book",
                              charter_type: (t as any).charter_type ?? "private_charter",
                              seats_available: (t as any).seats_available ?? null,
                              min_seats_to_sail: (t as any).min_seats_to_sail ?? null,

                              target_species: Array.isArray((t as any).target_species) ? (t as any).target_species : [],
                              environments: Array.isArray((t as any).environments) ? (t as any).environments : [],
                              techniques: Array.isArray((t as any).techniques) ? (t as any).techniques : [],
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
                  );
                })}

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

      <ConnectPayoutsDialog
        open={payoutsOpen}
        onOpenChange={setPayoutsOpen}
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

      <div className="mt-10 flex justify-start">
        <ReportListingDialog listingId={operator?.id ?? null} />
      </div>
    </div>
  );
}

