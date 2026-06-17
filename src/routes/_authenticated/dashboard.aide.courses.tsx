import { Fragment, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/brand/Logo";
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
import { Pencil, Clock, Trash2, BookOpen, Users, DollarSign, Plus, Sparkles, Ticket, ChevronDown, CheckCircle2, FileEdit, AlertTriangle, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  listMyJourneysWithStats,
  archiveJourney,
  deleteJourney,
  type JourneyRow,
  type JourneyWithStats,
} from "@/lib/journeys.functions";
import { getMyAvailability, type AvailabilityRow } from "@/lib/availability.functions";
import { getMyStripeIds } from "@/lib/payouts.functions";

import { AvailabilityDrawer } from "@/components/availability/AvailabilityDrawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format-currency";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { startNewMentorExpressListing } from "@/stores/useMentorExpressStore";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";
import { ScheduleLiveDateDialog } from "@/components/listings/ScheduleLiveDateDialog";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const LEAF = DESIGN_SYSTEM.colors.leafGreen;
const YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;

export const Route = createFileRoute("/_authenticated/dashboard/aide/courses")({
  head: () => ({
    meta: [
      { title: "My Listings — FishTrippers" },
      { name: "description", content: "Manage the listings you offer as an Aide." },
    ],
  }),
  component: MyCoursesPage,
});

function StatusBadge({
  status,
  moderation,
  moderationNote,
}: {
  status: JourneyRow["status"];
  moderation: JourneyRow["moderation_status"];
  moderationNote?: string | null;
}) {
  let label = "Draft";
  let cls = "text-yellow-900";
  let inlineStyle: React.CSSProperties | undefined = {
    backgroundColor: `${YELLOW}66`,
  };

  if (status === "draft" && moderationNote && moderationNote.trim().length > 0) {
    label = "⚠️ Action Needed";
    cls = "bg-amber-100 text-amber-900";
    inlineStyle = undefined;
  } else if (status === "archived") {
    label = "Archived";
    cls = "bg-orange-100 text-orange-700";
    inlineStyle = undefined;
  } else if (status === "published") {
    if (moderation === "approved") {
      label = "Live";
      cls = "bg-emerald-100 text-emerald-700";
      inlineStyle = undefined;
    } else if (moderation === "declined") {
      label = "Declined";
      cls = "bg-red-100 text-red-700";
      inlineStyle = undefined;
    } else {
      label = "Pending Review";
    }
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
      style={inlineStyle}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
  href,
}: {
  label: string;
  value: string;
  icon: typeof BookOpen;
  tint: string;
  href?: string;
}) {
  const content = (
    <Card className={`rounded-2xl border-border/60 p-5 transition-shadow ${href ? 'hover:shadow-md cursor-pointer' : ''}`}>
      <div className="flex items-center gap-4">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: tint }}
        >
          <Icon className="size-5 text-foreground" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground" style={lora}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return content;
}

function hasShowcaseContent(j: JourneyRow): boolean {
  const images = Array.isArray(j.showcase_images) ? j.showcase_images : [];
  const portfolio = Array.isArray(j.portfolio_assets) ? j.portfolio_assets : [];
  return (
    images.length > 0 ||
    portfolio.length > 0 ||
    !!j.showcase_video_url ||
    !!j.showcase_audio_url ||
    !!j.featured_image_url
  );
}

function hasAvailabilityConfigured(a: AvailabilityRow | undefined): boolean {
  if (!a) return false;
  for (const day of Object.values(a.slots)) {
    if (day.morning || day.afternoon || day.evening) return true;
  }
  return false;
}

function computeStrength(j: JourneyRow, hasAvailability: boolean, isPayoutReady: boolean) {
  const showcase = hasShowcaseContent(j);
  const score =
    70 + (showcase ? 10 : 0) + (hasAvailability ? 10 : 0) + (isPayoutReady ? 10 : 0);
  return { score, showcase, availability: hasAvailability, stripe: isPayoutReady };
}

function MyCoursesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fetchFn = useServerFn(listMyJourneysWithStats);
  const archiveFn = useServerFn(archiveJourney);
  const deleteFn = useServerFn(deleteJourney);
  const availabilityFn = useServerFn(getMyAvailability);
  const { guard, dialog: profileGuardDialog } = useProfileGuard();
  
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [openStrengthId, setOpenStrengthId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "archive" | "delete"; row: JourneyWithStats }
    | null
  >(null);
  const [scheduleFor, setScheduleFor] = useState<JourneyRow | null>(null);

  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      navigate({ to: "/login" });
    }
  }, [user, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-journeys-stats", user?.id ?? null],
    queryFn: () => fetchFn(),
    enabled: !!user,
  });

  const { data: availability, refetch: refetchAvailability } = useQuery({
    queryKey: ["my-availability", user?.id ?? null],
    queryFn: () => availabilityFn(),
    enabled: !!user,
  });

  const stripeFn = useServerFn(getMyStripeIds);
  const { data: stripeIds } = useQuery({
    queryKey: ["my-stripe-ids", user?.id ?? null],
    queryFn: () => stripeFn(),
    enabled: !!user,
  });
  const isPayoutReady = !!stripeIds?.is_payout_ready;

  const hasAvailability = hasAvailabilityConfigured(availability);


  if (!user) return null;

  const rows = data ?? [];
  const liveCount = rows.filter((r) => r.row.status === "published" && r.row.moderation_status === "approved").length;
  const studentTotal = rows.reduce((s, r) => s + r.enrolled, 0);
  const earnedTotal = rows.reduce((s, r) => s + r.earned_minor, 0);
  const earnedCurrency = rows[0]?.row.currency ?? "USD";

  const onTrashClick = (r: JourneyWithStats) => {
    setConfirm({ kind: r.enrolled > 0 ? "archive" : "delete", row: r });
  };

  const onConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === "archive") {
        await archiveFn({ data: { id: confirm.row.row.id } });
        toast.success("Course archived");
      } else {
        await deleteFn({ data: { id: confirm.row.row.id } });
        toast.success("Course deleted");
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      {profileGuardDialog}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 md:px-6 lg:px-8 py-4">
          <Logo size="md" />
          <Button asChild variant="ghost">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
        {/* Stripe payout banner suppressed — payments temporarily disabled. */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
              My Listings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage every listing you offer as an Aide.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-2xl"
              onClick={() => setAvailabilityOpen(true)}
            >
              <Clock className="size-4" /> Lab Hours
            </Button>
            <Button
              asChild
              className="gap-2 rounded-2xl text-white hover:opacity-90"
              style={{ backgroundColor: LEAF }}
            >
              <Link
                to="/mentor/create-path"
                search={{ new: true }}
                onClick={guard(startNewMentorExpressListing)}
              >
                <Plus className="size-4" /> Create New Listing
              </Link>
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Live Listings"
            value={String(liveCount)}
            icon={BookOpen}
            tint={`${YELLOW}33`}
          />
          <StatCard
            label="Active Students"
            value={String(studentTotal)}
            icon={Users}
            tint={`${LEAF}33`}
          />
          <StatCard
            label="Total Earnings"
            value={formatCurrency(earnedTotal, earnedCurrency)}
            icon={DollarSign}
            tint={`${YELLOW}33`}
            href="/dashboard/earnings"
          />
        </div>

        <Card className="mt-6 overflow-hidden rounded-2xl border-border/60 bg-card">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading your listings…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <TooltipProvider delayDuration={150}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Listing Strength</TableHead>
                    <TableHead className="hidden md:table-cell">Session Details</TableHead>
                    <TableHead className="hidden md:table-cell">Capacity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const j = r.row;
                    const isDraft = j.status === "draft";
                    const strength = computeStrength(j, hasAvailability, isPayoutReady);
                    const isOpen = openStrengthId === j.id;
                    const gaugeColor = strength.score >= 100 ? LEAF : YELLOW;
                    return (
                      <Fragment key={j.id}>
                      <TableRow key={j.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {j.cover_image_url ? (
                              <img
                                src={j.cover_image_url}
                                alt=""
                                className="size-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div
                                className="flex size-10 items-center justify-center rounded-lg text-lg"
                                style={{ backgroundColor: `${YELLOW}33` }}
                              >
                                🍋
                              </div>
                            )}
                            <div className="min-w-0">
                              {j.status === "draft" || !j.slug ? (
                                <Link
                                  to="/mentor/create-path"
                                  search={{ draftId: j.id }}
                                  className="block truncate font-medium hover:underline"
                                >
                                  {j.title || "Untitled draft"}
                                </Link>
                              ) : (
                                <Link
                                  to="/p/$pathSlug"
                                  params={{ pathSlug: j.slug }}
                                  className="block truncate font-medium hover:underline"
                                >
                                  {j.title}
                                </Link>
                              )}
                              <p className="text-xs text-muted-foreground">
                                #{j.course_id_slug}
                                <span className="md:hidden">
                                  {" · "}
                                  {j.session_count} × {j.session_length_minutes}m
                                </span>
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isDraft ? (
                            <Button
                              asChild
                              size="sm"
                              className="gap-1.5 rounded-full text-white hover:opacity-90"
                              style={{ backgroundColor: LEAF }}
                            >
                              <Link
                                to="/mentor/create-path"
                                search={{ draftId: j.id }}
                              >
                                <FileEdit className="size-3.5" />
                                Resume Draft
                              </Link>
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenStrengthId(isOpen ? null : j.id)}
                              className="group inline-flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted/60"
                              aria-expanded={isOpen}
                            >
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${strength.score}%`,
                                    backgroundColor: gaugeColor,
                                  }}
                                />
                              </div>
                              <span
                                className="text-xs font-semibold tabular-nums"
                                style={{ color: gaugeColor }}
                              >
                                {strength.score}%
                              </span>
                              <ChevronDown
                                className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-y-0.5"
                                style={{
                                  transform: isOpen ? "rotate(180deg)" : undefined,
                                }}
                              />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {j.session_count} {j.session_count === 1 ? "Session" : "Sessions"} @ {j.session_length_minutes}m
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {j.capacity} {j.capacity === 1 ? "Seat" : "Seats"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(j.base_price_minor, j.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={j.status} moderation={j.moderation_status} moderationNote={j.moderation_note} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    navigate({
                                      to: "/dashboard/listings/$journeyId/showcase",
                                      params: { journeyId: j.id },
                                    })
                                  }
                                >
                                  <Sparkles className="size-4" style={{ color: YELLOW }} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Add Showcase</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setScheduleFor(j)}
                                >
                                  <CalendarPlus className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Schedule Live Date</TooltipContent>
                            </Tooltip>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit"
                              onClick={() =>
                                navigate({
                                  to: "/mentor/create-path",
                                  search: { draftId: j.id },
                                })
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Manage Coupons & Discounts"
                              onClick={() =>
                                navigate({
                                  to: "/dashboard/listings/$journeyId/coupons",
                                  params: { journeyId: j.id },
                                })
                              }
                            >
                              <Ticket className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title={r.enrolled > 0 ? "Archive" : "Delete"}
                              onClick={() => onTrashClick(r)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && !isDraft && (
                        <TableRow key={`${j.id}-strength`} className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <StrengthAccordion
                              journeyId={j.id}
                              score={strength.score}
                              hasShowcase={strength.showcase}
                              hasAvailability={strength.availability}
                              hasStripe={strength.stripe}
                              onOpenAvailability={() => setAvailabilityOpen(true)}
                              navigate={navigate}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              </TooltipProvider>
            </div>
          )}
        </Card>
      </main>


      <AvailabilityDrawer
        open={availabilityOpen}
        onOpenChange={(o) => {
          setAvailabilityOpen(o);
          if (!o) refetchAvailability();
        }}
      />

      <ScheduleLiveDateDialog
        row={
          scheduleFor
            ? {
                id: scheduleFor.id,
                title: scheduleFor.title,
                base_price_minor: scheduleFor.base_price_minor,
                currency: scheduleFor.currency,
                moderation_status: scheduleFor.moderation_status,
              }
            : null
        }
        onOpenChange={(o) => !o && setScheduleFor(null)}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "archive"
                ? "Archive this Course?"
                : "Permanently delete this Course?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "archive"
                ? `"${confirm.row.row.title}" has ${confirm.row.enrolled} active student${confirm.row.enrolled === 1 ? "" : "s"}. It can't be deleted, but it will be archived and hidden from search.`
                : `This will permanently remove "${confirm?.row.row.title}". This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              {confirm?.kind === "archive" ? "Archive" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState() {
  const { guard, dialog: profileGuardDialog } = useProfileGuard();
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      {profileGuardDialog}
      <div
        className="flex size-20 items-center justify-center rounded-full text-4xl"
        style={{ backgroundColor: `${YELLOW}40` }}
      >
        🍋
      </div>
      <div>
        <h2 className="text-xl font-semibold" style={lora}>
          Fresh start — no listings yet
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Squeeze your first listing and start sharing what you know.
        </p>
      </div>
      <Button
        asChild
        className="rounded-2xl text-white hover:opacity-90"
        style={{ backgroundColor: LEAF }}
      >
        <Link
          to="/mentor/create-path"
          search={{ new: true }}
          onClick={guard(startNewMentorExpressListing)}
        >
          Squeeze your first listing!
        </Link>
      </Button>
    </div>
  );
}

interface StrengthAccordionProps {
  journeyId: string;
  score: number;
  hasShowcase: boolean;
  hasAvailability: boolean;
  hasStripe: boolean;
  onOpenAvailability: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

function StrengthAccordion({
  journeyId,
  score,
  hasShowcase,
  hasAvailability,
  hasStripe,
  onOpenAvailability,
  navigate,
}: StrengthAccordionProps) {
  if (score >= 100) {
    return (
      <div
        className="m-3 rounded-xl px-4 py-3 text-sm font-medium"
        style={{ backgroundColor: `${LEAF}22`, color: LEAF }}
      >
        🎉 Congratulations! Your listing is at 100% strength and fully optimized to attract students and get you paid!
      </div>
    );
  }

  return (
    <div className="m-3 space-y-2 rounded-xl bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Boost your listing strength
      </p>

      {hasShowcase ? (
        <ChecklistRow done label="Project & Media Showcase added" />
      ) : (
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">❌ Add a Project & Media Showcase (+10%)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Boost conversion by showing students what they will create!
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-full text-white hover:opacity-90"
              style={{ backgroundColor: LEAF }}
              onClick={() =>
                navigate({
                  to: "/dashboard/listings/$journeyId/showcase",
                  params: { journeyId },
                })
              }
            >
              Add Showcase
            </Button>
          </div>
        </div>
      )}

      {hasAvailability ? (
        <ChecklistRow done label="Session Availability configured" />
      ) : (
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">❌ Add Your Session Availability (+10%)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Let students know when you are free to teach or review work.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              style={{ borderColor: LEAF, color: LEAF }}
              onClick={onOpenAvailability}
            >
              Set Availability
            </Button>
          </div>
        </div>
      )}

      {hasStripe ? (
        <ChecklistRow done label="Stripe payout account connected" />
      ) : (
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">❌ Connect Stripe to enable payouts (+10%)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Link your Stripe account so you can receive payments from students.
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-full text-white hover:opacity-90"
              style={{ backgroundColor: LEAF }}
              onClick={() => navigate({ to: "/settings/billing" })}
            >
              Connect Stripe
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="size-4" style={{ color: done ? LEAF : undefined }} />
      <span>{label}</span>
    </div>
  );
}

