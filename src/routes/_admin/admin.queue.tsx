import { Fragment, useMemo, useState } from "react";
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
  Clock,
  Hourglass,
  DollarSign,
  Copy,
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
  getCancellationDisputeStageCounts,
  markCancellationDisputePaidOut,
  type CancellationDisputeRow,
  type DisputeScope,
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
import { RejectListingDialog } from "@/components/admin/RejectListingDialog";
import { VerificationReviewDialog } from "@/components/admin/VerificationReviewDialog";
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
  const [verifyTarget, setVerifyTarget] = useState<{ ownerId: string; name: string } | null>(null);

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
              <TableHead>Verification</TableHead>
              <TableHead>Status</TableHead>
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
                      {(() => {
                        const vs = (j as any).verification_status as
                          | "Pending Verification"
                          | "Documents Uploaded"
                          | "Verified"
                          | "Rejected"
                          | null;
                        const ownerId = (j as any).verification_user_id as string;
                        const ownerName = j.mentor_name ?? j.mentor_email ?? "Captain";
                        if (!vs || vs === "Pending Verification") {
                          return <StatusBadge tone="gray">Not Submitted</StatusBadge>;
                        }
                        if (vs === "Documents Uploaded") {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => setVerifyTarget({ ownerId, name: ownerName })}
                            >
                              View Docs
                            </Button>
                          );
                        }
                        const tone = vs === "Verified" ? "green" : "red";
                        return (
                          <button
                            type="button"
                            onClick={() => setVerifyTarget({ ownerId, name: ownerName })}
                            className="cursor-pointer"
                          >
                            <StatusBadge tone={tone}>{vs}</StatusBadge>
                          </button>
                        );
                      })()}
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
      <VerificationReviewDialog
        open={!!verifyTarget}
        onOpenChange={(open) => {
          if (!open) setVerifyTarget(null);
        }}
        ownerId={verifyTarget?.ownerId ?? null}
        ownerName={verifyTarget?.name ?? ""}
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
                </Fragment>

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

const HOLD_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysRemaining(resolvedAt: string | null): number {
  if (!resolvedAt) return HOLD_DAYS;
  const elapsed = (Date.now() - new Date(resolvedAt).getTime()) / MS_PER_DAY;
  return Math.max(0, Math.ceil(HOLD_DAYS - elapsed));
}

function releaseDate(resolvedAt: string | null): string | null {
  if (!resolvedAt) return null;
  return new Date(new Date(resolvedAt).getTime() + HOLD_DAYS * MS_PER_DAY).toISOString();
}

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-6 px-1.5"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
    >
      <Copy className="size-3" />
    </Button>
  );
}

function PayoutDetailsBlock({ row }: { row: CancellationDisputeRow }) {
  const method = row.angler_payout_method;
  const details = row.angler_payout_details ?? {};
  const addr = row.angler_address;

  const lines: Array<{ label: string; value: string }> = [];

  if (method === "ach") {
    if (details.bank_name) lines.push({ label: "Bank", value: String(details.bank_name) });
    if (details.account_holder)
      lines.push({ label: "Account holder", value: String(details.account_holder) });
    if (details.routing_number)
      lines.push({ label: "Routing #", value: String(details.routing_number) });
    if (details.account_number)
      lines.push({ label: "Account #", value: String(details.account_number) });
  } else if (method === "wallet") {
    if (details.wallet_provider)
      lines.push({ label: "Provider", value: String(details.wallet_provider) });
    if (details.wallet_handle)
      lines.push({ label: "Handle", value: String(details.wallet_handle) });
    if (details.wallet_email)
      lines.push({ label: "Email", value: String(details.wallet_email) });
  }

  const hasAddress =
    addr && (addr.line1 || addr.city || addr.state_province || addr.postal_code);
  const showAddress = method === "address" || (lines.length === 0 && hasAddress);

  if (showAddress && hasAddress) {
    const addrStr = [
      addr!.line1,
      addr!.line2,
      [addr!.city, addr!.state_province, addr!.postal_code].filter(Boolean).join(", "),
      addr!.country,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push({ label: "Mailing address", value: addrStr });
  }

  if (lines.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No payout preference on file
        {row.angler_email ? (
          <>
            {" — "}
            <span className="font-medium text-foreground">{row.angler_email}</span>
          </>
        ) : null}
      </div>
    );
  }

  const methodLabel =
    method === "ach"
      ? "ACH"
      : method === "wallet"
        ? "Digital wallet"
        : method === "address"
          ? "Mailing address"
          : "Address (fallback)";

  return (
    <div className="min-w-[240px] space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {methodLabel}
      </div>
      {lines.map((l) => (
        <div key={l.label} className="flex items-start gap-1.5 text-xs">
          <div className="min-w-[88px] text-muted-foreground">{l.label}</div>
          <div className="flex-1 whitespace-pre-wrap font-medium text-foreground">
            {l.value}
          </div>
          <CopyButton value={l.value} />
        </div>
      ))}
      {row.angler_email ? (
        <div className="flex items-start gap-1.5 text-xs">
          <div className="min-w-[88px] text-muted-foreground">Email</div>
          <div className="flex-1 font-medium text-foreground">{row.angler_email}</div>
          <CopyButton value={row.angler_email} />
        </div>
      ) : null}
    </div>
  );
}

function CancellationDisputes() {
  const [stage, setStage] = useState<DisputeScope>("active");
  const [payoutTarget, setPayoutTarget] = useState<CancellationDisputeRow | null>(null);
  const fetchDisputes = useServerFn(listAdminCancellationDisputes);
  const fetchCounts = useServerFn(getCancellationDisputeStageCounts);
  const resolveFn = useServerFn(resolveCancellationDispute);
  const payoutFn = useServerFn(markCancellationDisputePaidOut);
  const qc = useQueryClient();

  const countsQ = useQuery({
    queryKey: ["admin", "queue", "cancellations", "counts"],
    queryFn: () => fetchCounts(),
    refetchInterval: 60_000,
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin", "queue", "cancellations", stage],
    queryFn: () => fetchDisputes({ data: { scope: stage } }),
    refetchInterval: stage === "holding" || stage === "ready" ? 60_000 : undefined,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "queue", "cancellations"] });
    void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  const resolveMutation = useMutation({
    mutationFn: (vars: { disputeId: string; decision: "approved" | "denied" }) =>
      resolveFn({ data: vars }),
    onSuccess: (_, v) => {
      toast.success(
        v.decision === "approved"
          ? "Approved — moved to 60-day holding pool"
          : "Claim denied",
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payoutMutation = useMutation({
    mutationFn: (vars: { disputeId: string }) => payoutFn({ data: vars }),
    onSuccess: () => {
      toast.success("Payout recorded — moved to Completed");
      setPayoutTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = countsQ.data ?? { active: 0, holding: 0, ready: 0, completed: 0 };
  const hasReadyAlert = counts.ready > 0;
  const list = rows ?? [];

  const stageDef: Array<{
    value: DisputeScope;
    label: string;
    count: number;
    alert?: boolean;
  }> = [
    { value: "active", label: "Active Disputes", count: counts.active },
    { value: "holding", label: "Holding Pool (60d)", count: counts.holding },
    { value: "ready", label: "Ready for Payout", count: counts.ready, alert: hasReadyAlert },
    { value: "completed", label: "Completed", count: counts.completed },
  ];

  return (
    <div className="space-y-4">
      {hasReadyAlert ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="size-4" />
          <span className="font-medium">
            {counts.ready} dispute{counts.ready === 1 ? "" : "s"} ready for manual payout.
          </span>
          {stage !== "ready" ? (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 border-amber-400 bg-white px-2 text-amber-900 hover:bg-amber-100"
              onClick={() => setStage("ready")}
            >
              Review now
            </Button>
          ) : null}
        </div>
      ) : null}

      <Tabs value={stage} onValueChange={(v) => setStage(v as DisputeScope)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:max-w-3xl">
          {stageDef.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="relative">
              <span>{s.label}</span>
              <span className="ml-1 text-xs opacity-70">({s.count})</span>
              {s.alert ? (
                <span className="ml-1.5 inline-block size-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Listing Title</TableHead>
                <TableHead>Captain</TableHead>
                <TableHead>Angler</TableHead>
                {stage === "active" ? (
                  <>
                    <TableHead>Booked</TableHead>
                    <TableHead>Cancelled</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Messages</TableHead>
                  </>
                ) : stage === "holding" ? (
                  <>
                    <TableHead>Approved</TableHead>
                    <TableHead>Days remaining</TableHead>
                    <TableHead>Releases on</TableHead>
                  </>
                ) : stage === "ready" ? (
                  <>
                    <TableHead>Approved</TableHead>
                    <TableHead>Payout due since</TableHead>
                    <TableHead>Preferred Payout Details</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Final status</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Paid out</TableHead>
                  </>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <LoadingRow colSpan={9} />
              ) : list.length === 0 ? (
                <EmptyRow
                  colSpan={9}
                  title={
                    stage === "active"
                      ? "No active disputes"
                      : stage === "holding"
                        ? "Nothing in the 60-day holding pool"
                        : stage === "ready"
                          ? "Nothing ready for payout"
                          : "No completed records yet"
                  }
                />
              ) : (
                list.map((r) => {
                  const release = releaseDate(r.resolved_at);
                  const remaining = daysRemaining(r.resolved_at);
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

                      {stage === "active" ? (
                        <>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDateTime(r.trip_date)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
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
                        </>
                      ) : stage === "holding" ? (
                        <>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDate(r.resolved_at)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                remaining <= 7
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-900",
                              )}
                            >
                              <Hourglass className="size-3" />
                              {remaining} day{remaining === 1 ? "" : "s"}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDate(release)}
                          </TableCell>
                        </>
                      ) : stage === "ready" ? (
                        <>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDate(r.resolved_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                              <Clock className="size-3" />
                              {fmtDate(release)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <PayoutDetailsBlock row={r} />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <StatusBadge tone={r.status === "paid_out" ? "green" : "red"}>
                              {r.status === "paid_out" ? "Paid out" : "Denied"}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDate(r.resolved_at)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDate(r.paid_out_at)}
                          </TableCell>
                        </>
                      )}

                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {stage === "active" ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 bg-primary text-primary-foreground hover:opacity-95"
                                disabled={resolveMutation.isPending}
                                onClick={() =>
                                  resolveMutation.mutate({
                                    disputeId: r.id,
                                    decision: "approved",
                                  })
                                }
                              >
                                <Check className="size-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2"
                                disabled={resolveMutation.isPending}
                                onClick={() =>
                                  resolveMutation.mutate({
                                    disputeId: r.id,
                                    decision: "denied",
                                  })
                                }
                              >
                                <Ban className="size-3.5" /> Deny
                              </Button>
                            </>
                          ) : stage === "holding" ? (
                            <StatusBadge tone="amber">In holding</StatusBadge>
                          ) : stage === "ready" ? (
                            <Button
                              size="sm"
                              className="h-8 gap-1 bg-amber-500 px-3 text-white hover:bg-amber-600"
                              onClick={() => setPayoutTarget(r)}
                            >
                              <DollarSign className="size-3.5" />
                              Confirm Manual Payment Sent
                            </Button>
                          ) : (
                            <StatusBadge
                              tone={r.status === "paid_out" ? "green" : "gray"}
                            >
                              {r.status === "paid_out" ? "Archived" : "Closed"}
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
      </Tabs>

      <AlertDialog
        open={!!payoutTarget}
        onOpenChange={(o) => {
          if (!o) setPayoutTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm manual payment sent</AlertDialogTitle>
            <AlertDialogDescription>
              This logs payout completion for{" "}
              <span className="font-medium text-foreground">
                {payoutTarget?.order_number ?? payoutTarget?.booking_id.slice(0, 8)}
              </span>{" "}
              and archives the dispute in the Completed tab. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payoutMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={payoutMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!payoutTarget) return;
                payoutMutation.mutate({ disputeId: payoutTarget.id });
              }}
            >
              {payoutMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm payment sent"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
