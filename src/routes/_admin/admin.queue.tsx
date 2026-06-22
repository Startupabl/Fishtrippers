import { useMemo, useState } from "react";
import { z } from "zod";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Mail,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Eye,
  AlertTriangle,
  Archive,
  Ban,
} from "lucide-react";
import {
  listReportedListings,
  dismissListingReport,
  sendReportedListingToDraft,
  suspendAndFreezeUser,
} from "@/lib/admin.functions";
import {
  listAdminListings as listAdminJourneys,
  setListingModeration as setJourneyModeration,
  archiveListing as archiveJourney,
} from "@/lib/admin-listings.functions";

import {
  listSupportTickets,
  resolveSupportTicket,
} from "@/lib/support-tickets.functions";
import {
  listAdminCancellationDisputes,
  resolveCancellationDispute,
} from "@/lib/cancellation-disputes.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RejectListingDialog } from "@/components/admin/RejectListingDialog";
import { cn } from "@/lib/utils";

const TAB_VALUES = ["listings", "inquiries", "flags", "cancellations"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const searchSchema = z.object({
  tab: z.enum(TAB_VALUES).default("listings"),
});

export const Route = createFileRoute("/_admin/admin/queue")({
  validateSearch: (s) => searchSchema.parse(s),
  component: QueuePage,
});

const TOPIC_LABEL: Record<string, string> = {
  general_question: "General Question",
  billing_stripe: "Billing & Stripe Connect",
  virtual_classroom_tech: "Virtual Classroom Tech Issue",
  booking_no_show: "Booking / No-Show Issue",
  specific_trip: "A specific trip",
  my_listing: "My listing",
  general_questions: "General questions",
  technical_issues: "Technical issues",
  other: "Other",
};

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function QueuePage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  function setTab(next: string) {
    navigate({ to: "/admin/queue", search: { tab: next as TabValue }, replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Main Admin
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Admin Action Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage and resolve everything in the action queue.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:max-w-3xl">
          <TabsTrigger value="listings">Listing Applications</TabsTrigger>
          <TabsTrigger value="inquiries">Support tickets</TabsTrigger>
          <TabsTrigger value="flags">Flagged Content</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellation Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          <ListingsToApprove />
        </TabsContent>
        <TabsContent value="inquiries" className="mt-6">
          <OpenInquiries />
        </TabsContent>
        <TabsContent value="flags" className="mt-6">
          <FlaggedContent />
        </TabsContent>
        <TabsContent value="cancellations" className="mt-6">
          <CancellationDisputes />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   Shared components
   ============================================================ */

type Scope = "queue" | "completed";

function ScopeTabs({
  scope,
  setScope,
  queueCount,
  completedCount,
  children,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
  queueCount: number;
  completedCount: number;
  children: React.ReactNode;
}) {
  return (
    <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)} className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
        <TabsTrigger value="queue">
          Queue <span className="ml-1 text-xs opacity-70">({queueCount})</span>
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed <span className="ml-1 text-xs opacity-70">({completedCount})</span>
        </TabsTrigger>
      </TabsList>
      <div className="mt-4">{children}</div>
    </Tabs>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "amber" | "green" | "red" | "gray";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "amber" && "bg-amber-100 text-amber-900",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "red" && "bg-red-100 text-red-800",
        tone === "gray" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function UserTypePill({ type }: { type: string }) {
  const label =
    type === "aide"
      ? "Captain/Guide"
      : type === "learner"
        ? "Angler"
        : type.charAt(0).toUpperCase() + type.slice(1);
  const color =
    type === "aide"
      ? "bg-primary/10 text-primary"
      : type === "learner"
        ? "bg-accent/20 text-primary"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", color)}>
      {label}
    </span>
  );
}

function MessagesPopover({
  label = "View",
  title,
  sections,
}: {
  label?: string;
  title: string;
  sections: Array<{ heading: string; body: string | null | undefined }>;
}) {
  const hasAny = sections.some((s) => s.body && s.body.trim().length > 0);
  if (!hasAny) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 px-2">
          <MessageSquare className="size-3.5" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <div className="mt-2 space-y-3">
          {sections
            .filter((s) => s.body && s.body.trim().length > 0)
            .map((s, i) => (
              <div key={i}>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.heading}
                </div>
                <div className="mt-1 rounded-md bg-muted/40 p-2 text-sm whitespace-pre-wrap">
                  {s.body}
                </div>
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmptyRow({ colSpan, title }: { colSpan: number; title: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <CheckCircle2 className="mx-auto size-7 text-primary" />
        <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      </TableCell>
    </TableRow>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        Loading…
      </TableCell>
    </TableRow>
  );
}

/* ============================================================
   Listing Applications
   ============================================================ */

function ListingsToApprove() {
  const [scope, setScope] = useState<Scope>("queue");
  const fetchListings = useServerFn(listAdminJourneys);
  const moderate = useServerFn(setJourneyModeration);
  const archiveFn = useServerFn(archiveJourney);
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);

  const queueQ = useQuery({
    queryKey: ["admin", "queue", "listings", "queue"],
    queryFn: () => fetchListings({ data: { moderation: "pending" } }),
  });
  const completedQ = useQuery({
    queryKey: ["admin", "queue", "listings", "completed"],
    queryFn: () => fetchListings({ data: { moderation: "reviewed" } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "queue", "listings"] });
    void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    void qc.invalidateQueries({ queryKey: ["admin", "listings"] });
  };

  const moderateMutation = useMutation({
    mutationFn: (vars: {
      journeyId: string;
      moderation: "approved" | "declined";
      note?: string;
      reasonKey?: string;
    }) => moderate({ data: vars }),
    onSuccess: (_, v) => {
      if (v.moderation === "approved") toast.success("Listing approved");
      else {
        toast.success("Listing rejected — captain/guide has been notified");
        setRejectTarget(null);
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (journeyId: string) => archiveFn({ data: { journeyId } }),
    onSuccess: () => {
      toast.success("Listing archived");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const queueRows = Array.isArray(queueQ.data) ? queueQ.data : [];
  const completedRows = Array.isArray(completedQ.data) ? completedQ.data : [];
  const rows = scope === "queue" ? queueRows : completedRows;
  const isLoading = scope === "queue" ? queueQ.isLoading : completedQ.isLoading;

  return (
    <ScopeTabs
      scope={scope}
      setScope={setScope}
      queueCount={queueRows.length}
      completedCount={completedRows.length}
    >
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Captain</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={6} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={6}
                title={
                  scope === "queue"
                    ? "No listings awaiting approval"
                    : "No reviewed listings yet"
                }
              />
            ) : (
              rows.map((j) => {
                const slug = j.slug;
                const mod = j.moderation_status;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">
                      {j.course_id_slug ?? j.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {j.mentor_name ?? j.mentor_email ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(j.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={
                          mod === "approved"
                            ? "green"
                            : mod === "declined"
                              ? "red"
                              : "amber"
                        }
                      >
                        {mod === "approved"
                          ? "Approved"
                          : mod === "declined"
                            ? "Declined"
                            : "Pending"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {slug ? (
                          <Button asChild size="sm" variant="outline" className="h-7 px-2">
                            <Link
                              to="/p/$pathSlug"
                              params={{ pathSlug: slug }}
                              search={{ admin: 1 as const }}
                            >
                              <Eye className="size-3.5" /> View
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-2" disabled>
                            <Eye className="size-3.5" /> View
                          </Button>
                        )}
                        {scope === "queue" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-primary text-primary-foreground hover:opacity-95"
                              onClick={() =>
                                moderateMutation.mutate({
                                  journeyId: j.id,
                                  moderation: "approved",
                                })
                              }
                              disabled={moderateMutation.isPending}
                            >
                              <Check className="size-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-amber-500 text-white hover:bg-amber-600"
                              onClick={() => setRejectTarget({ id: j.id, title: j.title })}
                              disabled={moderateMutation.isPending}
                            >
                              <AlertTriangle className="size-3.5" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2"
                              disabled={archiveMutation.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Archive this listing? It will move to the Archived tab and disappear from active queues.",
                                  )
                                ) {
                                  archiveMutation.mutate(j.id);
                                }
                              }}
                            >
                              <Archive className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RejectListingDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        listingTitle={rejectTarget?.title ?? ""}
        isSubmitting={moderateMutation.isPending}
        onSubmit={(note, reasonKey) => {
          if (!rejectTarget) return;
          moderateMutation.mutate({
            journeyId: rejectTarget.id,
            moderation: "declined",
            note,
            reasonKey,
          });
        }}
      />
    </ScopeTabs>
  );
}

/* ============================================================
   Support Tickets
   ============================================================ */

function OpenInquiries() {
  const [scope, setScope] = useState<Scope>("queue");
  const fetchTickets = useServerFn(listSupportTickets);
  const resolve = useServerFn(resolveSupportTicket);
  const qc = useQueryClient();
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const queueQ = useQuery({
    queryKey: ["admin", "queue", "tickets", "queue"],
    queryFn: () => fetchTickets({ data: { status: "pending_review" } }),
  });
  const completedQ = useQuery({
    queryKey: ["admin", "queue", "tickets", "completed"],
    queryFn: () => fetchTickets({ data: { status: "resolved" } }),
  });

  const mutation = useMutation({
    mutationFn: (ticketId: string) => resolve({ data: { ticketId } }),
    onSuccess: () => {
      toast.success("Marked as resolved");
      void qc.invalidateQueries({ queryKey: ["admin", "queue", "tickets"] });
      void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const queueRows = queueQ.data ?? [];
  const completedRows = completedQ.data ?? [];
  const rows = scope === "queue" ? queueRows : completedRows;
  const isLoading = scope === "queue" ? queueQ.isLoading : completedQ.isLoading;

  function openReply(ticket: (typeof rows)[number]) {
    if (replyingId === ticket.id) {
      setReplyingId(null);
      return;
    }
    setReplyingId(ticket.id);
    setReplyText(
      `Hi ${ticket.full_name.split(" ")[0]},\n\nThanks for reaching out to FishTrippers Support — `,
    );
  }

  function sendReply(ticket: (typeof rows)[number]) {
    const subject = encodeURIComponent(
      `Re: ${TOPIC_LABEL[ticket.topic] ?? "Your support request"}`,
    );
    const body = encodeURIComponent(replyText);
    window.location.href = `mailto:${ticket.email}?subject=${subject}&body=${body}`;
  }

  return (
    <ScopeTabs
      scope={scope}
      setScope={setScope}
      queueCount={queueRows.length}
      completedCount={completedRows.length}
    >
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket #</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={7} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={7}
                title={
                  scope === "queue"
                    ? "No open support tickets — you're all caught up"
                    : "No resolved tickets yet"
                }
              />
            ) : (
              rows.map((t) => (
                <Fragment key={t.id}>
                  <TableRow>

                    <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{t.full_name}</div>
                      <div className="text-xs text-muted-foreground">{t.email}</div>
                    </TableCell>
                    <TableCell>
                      <UserTypePill type={t.user_type} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TOPIC_LABEL[t.topic] ?? t.topic}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(t.created_at)}
                    </TableCell>
                    <TableCell>
                      <MessagesPopover
                        title={t.full_name}
                        sections={[
                          { heading: "Message", body: t.message },
                          t.booking_id
                            ? { heading: "Booking / Charter", body: t.booking_id }
                            : { heading: "", body: null },
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {scope === "queue" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => openReply(t)}
                            >
                              <MessageSquare className="size-3.5" />
                              {replyingId === t.id ? "Close" : "Reply"}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-primary text-primary-foreground hover:opacity-95"
                              onClick={() => mutation.mutate(t.id)}
                              disabled={mutation.isPending}
                            >
                              {mutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
                              Resolve
                            </Button>
                          </>
                        ) : (
                          <StatusBadge tone="green">Resolved</StatusBadge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {replyingId === t.id && scope === "queue" && (
                    <TableRow key={`${t.id}-reply`}>
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="space-y-2 p-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={5}
                            placeholder="Draft your reply…"
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setReplyingId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => sendReply(t)}>
                              <Mail className="size-4" /> Open in email
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ScopeTabs>
  );
}

/* ============================================================
   Flagged Content
   ============================================================ */

const REASON_LABEL: Record<string, string> = {
  inappropriate: "Inappropriate content",
  scam: "Scam / fraud / misleading",
  external_payment: "External payment links",
  copyright: "Copyright / IP violation",
  other: "Other",
};

function FlaggedContent() {
  const [scope, setScope] = useState<Scope>("queue");
  const fetchReports = useServerFn(listReportedListings);
  const dismiss = useServerFn(dismissListingReport);
  const sendToDraft = useServerFn(sendReportedListingToDraft);
  const suspend = useServerFn(suspendAndFreezeUser);
  const qc = useQueryClient();

  type ReportRow = Awaited<ReturnType<typeof fetchReports>>[number];
  const [draftTarget, setDraftTarget] = useState<ReportRow | null>(null);

  const queueQ = useQuery({
    queryKey: ["admin", "queue", "flags", "queue"],
    queryFn: () => fetchReports({ data: { scope: "queue" } }),
  });
  const completedQ = useQuery({
    queryKey: ["admin", "queue", "flags", "completed"],
    queryFn: () => fetchReports({ data: { scope: "completed" } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "queue", "flags"] });
    void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    void qc.invalidateQueries({ queryKey: ["admin", "listings"] });
  };

  const dismissMutation = useMutation({
    mutationFn: (reportId: string) => dismiss({ data: { reportId } }),
    onSuccess: () => {
      toast.success("Flag dismissed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const draftMutation = useMutation({
    mutationFn: (vars: { reportId: string; journeyId: string; note: string; reasonKey?: string }) =>
      sendToDraft({ data: vars }),
    onSuccess: () => {
      toast.success("Listing sent to draft — owner has been notified");
      setDraftTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendMutation = useMutation({
    mutationFn: (vars: { reportId: string; journeyId: string; ownerId: string }) =>
      suspend({ data: vars }),
    onSuccess: (res) => {
      toast.success(
        res?.ipBlocked
          ? "User suspended and IP blocked"
          : "User suspended (no IP on record to block)",
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const queueRows = useMemo(() => queueQ.data ?? [], [queueQ.data]);
  const completedRows = useMemo(() => completedQ.data ?? [], [completedQ.data]);
  const rows = scope === "queue" ? queueRows : completedRows;
  const isLoading = scope === "queue" ? queueQ.isLoading : completedQ.isLoading;

  return (
    <ScopeTabs
      scope={scope}
      setScope={setScope}
      queueCount={queueRows.length}
      completedCount={completedRows.length}
    >
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flag #</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={7} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={7}
                title={scope === "queue" ? "No open flags" : "No completed flags yet"}
              />
            ) : (
              rows.map((r) => {
                const viewHref =
                  r.journey_slug && r.journey_category
                    ? `/c/${r.journey_category}/${r.journey_slug}?admin=1`
                    : null;
                const completed = scope === "completed";
                const status = (r as any).status as string | undefined;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{r.journey_title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.mentor_name}</TableCell>
                    <TableCell>
                      <StatusBadge tone="red">
                        {REASON_LABEL[r.reason_category] ?? r.reason_category}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <MessagesPopover
                        title={r.journey_title}
                        sections={[{ heading: "Reporter details", body: r.custom_details }]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {viewHref ? (
                          <Button asChild size="sm" variant="outline" className="h-7 px-2">
                            <a href={viewHref} target="_blank" rel="noreferrer">
                              <Eye className="size-3.5" /> View
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-2" disabled>
                            <Eye className="size-3.5" /> View
                          </Button>
                        )}
                        {completed ? (
                          <StatusBadge tone="gray">{status ?? "resolved"}</StatusBadge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => dismissMutation.mutate(r.id)}
                              disabled={dismissMutation.isPending}
                            >
                              <CheckCircle2 className="size-3.5" /> Dismiss
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-amber-500 text-white hover:bg-amber-600"
                              onClick={() => setDraftTarget(r)}
                              disabled={draftMutation.isPending}
                            >
                              <AlertTriangle className="size-3.5" /> Draft
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2"
                              disabled={suspendMutation.isPending || !r.mentor_id}
                              onClick={() => {
                                if (!r.mentor_id) return;
                                if (
                                  window.confirm(
                                    `Suspend & freeze the owner of "${r.journey_title}"? This archives the listing, blocks the user's account, and adds their last IP to the IP block list. This cannot be easily undone.`,
                                  )
                                ) {
                                  suspendMutation.mutate({
                                    reportId: r.id,
                                    journeyId: r.listing_id,
                                    ownerId: r.mentor_id!,
                                  });
                                }
                              }}
                            >
                              <Ban className="size-3.5" /> Suspend
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RejectListingDialog
        open={!!draftTarget}
        onOpenChange={(open) => {
          if (!open) setDraftTarget(null);
        }}
        listingTitle={draftTarget?.journey_title ?? ""}
        isSubmitting={draftMutation.isPending}
        onSubmit={(note, reasonKey) => {
          if (!draftTarget) return;
          draftMutation.mutate({
            reportId: draftTarget.id,
            journeyId: draftTarget.listing_id,
            note,
            reasonKey,
          });
        }}
      />
    </ScopeTabs>
  );
}

/* ============================================================
   Cancellation Disputes
   ============================================================ */

function CancellationDisputes() {
  const [scope, setScope] = useState<Scope>("queue");
  const fetchDisputes = useServerFn(listAdminCancellationDisputes);
  const resolveFn = useServerFn(resolveCancellationDispute);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "queue", "cancellations"],
    queryFn: () => fetchDisputes(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { disputeId: string; decision: "approved" | "denied" }) =>
      resolveFn({ data: vars }),
    onSuccess: (_, v) => {
      toast.success(
        v.decision === "approved" ? "Captain payout approved" : "Claim denied",
      );
      void qc.invalidateQueries({ queryKey: ["admin", "queue", "cancellations"] });
      void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = data ?? [];
  const queueRows = all.filter((r) => r.status === "pending");
  const completedRows = all.filter((r) => r.status !== "pending");
  const rows = scope === "queue" ? queueRows : completedRows;

  return (
    <ScopeTabs
      scope={scope}
      setScope={setScope}
      queueCount={queueRows.length}
      completedCount={completedRows.length}
    >
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Listing Title</TableHead>
              <TableHead>Captain</TableHead>
              <TableHead>Angler</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead>Cancelled</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={9} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={9}
                title={
                  scope === "queue"
                    ? "No cancellation disputes"
                    : "No completed disputes yet"
                }
              />
            ) : (
              rows.map((r) => {
                const isPending = r.status === "pending";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.order_number ?? r.booking_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">{r.trip_title ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.captain_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.angler_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(r.trip_date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(r.cancellation_timestamp)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="gray">
                        {r.cancellation_policy
                          ? r.cancellation_policy.charAt(0).toUpperCase() +
                            r.cancellation_policy.slice(1)
                          : "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <MessagesPopover
                        title={r.trip_title ?? "Dispute"}
                        sections={[
                          { heading: "Captain's details", body: r.captain_details },
                          { heading: "Angler's reason", body: r.angler_written_reason },
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {isPending ? (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-2 bg-primary text-primary-foreground hover:opacity-95"
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ disputeId: r.id, decision: "approved" })
                              }
                            >
                              <Check className="size-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2"
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ disputeId: r.id, decision: "denied" })
                              }
                            >
                              <Ban className="size-3.5" /> Deny
                            </Button>
                          </>
                        ) : (
                          <StatusBadge tone={r.status === "approved" ? "green" : "red"}>
                            {r.status === "approved" ? "Approved" : "Denied"}
                          </StatusBadge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </ScopeTabs>
  );
}
