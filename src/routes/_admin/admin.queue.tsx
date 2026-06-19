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
import { ArrowLeft, Check, Mail, MessageSquare, CheckCircle2, Loader2, Eye, AlertTriangle, Archive, Ban } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RejectListingDialog } from "@/components/admin/RejectListingDialog";
import { cn } from "@/lib/utils";

const TAB_VALUES = ["listings", "inquiries", "flags"] as const;
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
};

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
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
        <TabsList className="grid w-full grid-cols-3 sm:max-w-2xl">
          <TabsTrigger value="listings">Listing Applications</TabsTrigger>
          <TabsTrigger value="inquiries">Support tickets</TabsTrigger>
          <TabsTrigger value="flags">Flagged Content</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

/* -------------------- Listings -------------------- */

function ListingsToApprove() {
  const fetchListings = useServerFn(listAdminJourneys);
  const moderate = useServerFn(setJourneyModeration);
  const archiveFn = useServerFn(archiveJourney);
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "queue", "listings"],
    queryFn: () => fetchListings({ data: { moderation: "pending" } }),
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
      if (v.moderation === "approved") {
        toast.success("Listing approved");
      } else {
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


  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    return <EmptyState title="No listings awaiting approval" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((j) => {
        const payoutReady = !!j.mentor_is_payout_ready;
        const slug = j.slug;
        return (
          <div key={j.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="amber">Pending Review</StatusBadge>
                  <StatusBadge tone={payoutReady ? "green" : "red"}>
                    {payoutReady ? "✅ Stripe Connected" : "⛔ Stripe Missing"}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">{relativeTime(j.created_at)}</span>
                </div>
                <h3 className="mt-2 font-semibold text-foreground">{j.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {j.category ?? "Uncategorized"} ·{" "}
                  {j.mentor_name ?? j.mentor_email ?? "Unknown mentor"}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {slug ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/p/$pathSlug"
                      params={{ pathSlug: slug }}
                      search={{ admin: 1 as const }}
                    >
                      <Eye className="size-4" /> View
                    </Link>
                  </Button>

                ) : (
                  <Button size="sm" variant="outline" disabled title="No public URL yet">
                    <Eye className="size-4" /> View
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => moderateMutation.mutate({ journeyId: j.id, moderation: "approved" })}
                  disabled={moderateMutation.isPending}
                  style={{ backgroundColor: "#0A2540" }}
                  className="text-white hover:opacity-95"
                >
                  <Check className="size-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  onClick={() => setRejectTarget({ id: j.id, title: j.title })}
                  disabled={moderateMutation.isPending}
                  className="bg-amber-500 text-white hover:bg-amber-600"
                >
                  <AlertTriangle className="size-4" /> Reject with Reason
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
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
                  <Archive className="size-4" /> 🗑️ Archive
                </Button>

              </div>
            </div>
          </div>
        );
      })}

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
    </div>
  );
}

/* -------------------- Inquiries -------------------- */

function OpenInquiries() {
  const fetchTickets = useServerFn(listSupportTickets);
  const resolve = useServerFn(resolveSupportTicket);
  const qc = useQueryClient();
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "queue", "tickets"],
    queryFn: () => fetchTickets({ data: { status: "pending_review" } }),
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const rows = data ?? [];
  if (rows.length === 0) {
    return <EmptyState title="No open support tickets — you're all caught up" />;
  }

  function openReply(ticket: typeof rows[number]) {
    if (replyingId === ticket.id) {
      setReplyingId(null);
      return;
    }
    setReplyingId(ticket.id);
    setReplyText(`Hi ${ticket.full_name.split(" ")[0]},\n\nThanks for reaching out to FishTrippers Support — `);
  }

  function sendReply(ticket: typeof rows[number]) {
    const subject = encodeURIComponent(`Re: ${TOPIC_LABEL[ticket.topic] ?? "Your support request"}`);
    const body = encodeURIComponent(replyText);
    window.location.href = `mailto:${ticket.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-3">
      {rows.map((t) => (
        <div key={t.id} className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="amber">Pending Review</StatusBadge>
                <UserTypePill type={t.user_type} />
                <span className="text-xs text-muted-foreground">{relativeTime(t.created_at)}</span>
              </div>
              <h3 className="mt-2 font-semibold text-foreground">{t.full_name}</h3>
              <p className="text-xs text-muted-foreground">{t.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-medium text-foreground">
                  Topic:{" "}
                  <span className="font-normal text-muted-foreground">
                    {TOPIC_LABEL[t.topic] ?? t.topic}
                  </span>
                </span>
                {t.booking_id && (
                  <span className="font-medium text-foreground">
                    Booking / Course:{" "}
                    <span className="font-normal text-muted-foreground">{t.booking_id}</span>
                  </span>
                )}
              </div>
              <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {t.message}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openReply(t)}
              >
                <MessageSquare className="size-4" />
                {replyingId === t.id ? "Close reply" : "Reply"}
              </Button>
              <Button
                size="sm"
                onClick={() => mutation.mutate(t.id)}
                disabled={mutation.isPending}
                style={{ backgroundColor: "#0A2540" }}
                className="text-white hover:opacity-95"
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Mark as Resolved
              </Button>
            </div>
          </div>

          {replyingId === t.id && (
            <div className="mt-4 space-y-2 border-t pt-4">
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
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------- Flags (community reports) -------------------- */

const REASON_LABEL: Record<string, string> = {
  inappropriate: "Inappropriate content",
  scam: "Scam / fraud / misleading",
  external_payment: "External payment links",
  copyright: "Copyright / IP violation",
  other: "Other",
};

function FlaggedContent() {
  const fetchReports = useServerFn(listReportedListings);
  const dismiss = useServerFn(dismissListingReport);
  const sendToDraft = useServerFn(sendReportedListingToDraft);
  const suspend = useServerFn(suspendAndFreezeUser);
  const qc = useQueryClient();

  type ReportRow = Awaited<ReturnType<typeof fetchReports>>[number];
  const [draftTarget, setDraftTarget] = useState<ReportRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "queue", "flags"],
    queryFn: () => fetchReports(),
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

  const rows = useMemo(() => data ?? [], [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) return <EmptyState title="No open flags" />;

  return (
    <>
      <div className="space-y-3">
        {rows.map((r) => {
          const viewHref =
            r.journey_slug && r.journey_category
              ? `/c/${r.journey_category}/${r.journey_slug}?admin=1`
              : null;
          return (
            <div key={r.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone="amber">Open</StatusBadge>
                    <StatusBadge tone="red">{REASON_LABEL[r.reason_category] ?? r.reason_category}</StatusBadge>
                    <span className="text-xs text-muted-foreground">{relativeTime(r.created_at)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-foreground">{r.journey_title}</h3>
                  <p className="text-xs text-muted-foreground">Owner: {r.mentor_name}</p>
                  {r.custom_details && (
                    <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm text-foreground whitespace-pre-wrap">
                      {r.custom_details}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {viewHref ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={viewHref} target="_blank" rel="noreferrer">
                        <Eye className="size-4" /> 👀 View
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <Eye className="size-4" /> View
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dismissMutation.mutate(r.id)}
                    disabled={dismissMutation.isPending}
                  >
                    <CheckCircle2 className="size-4" /> ✅ Dismiss Flag
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    onClick={() => setDraftTarget(r)}
                    disabled={draftMutation.isPending}
                  >
                    <AlertTriangle className="size-4" /> ⚠️ Send to Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
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
                          ownerId: r.mentor_id,
                        });
                      }
                    }}
                  >
                    <Ban className="size-4" /> ❌ Suspend & Freeze User
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
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
    </>
  );
}

/* -------------------- Shared bits -------------------- */

function StatusBadge({
  tone,
  children,
}: {
  tone: "amber" | "green" | "red";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "amber" && "bg-amber-100 text-amber-900",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "red" && "bg-red-100 text-red-800",
      )}
    >
      {children}
    </span>
  );
}

function UserTypePill({ type }: { type: string }) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const color =
    type === "aide"
      ? "bg-[#0A2540]/10 text-[#1f6b3a]"
      : type === "learner"
        ? "bg-blue-100 text-blue-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", color)}>
      {label}
    </span>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-white p-10 text-center">
      <CheckCircle2 className="mx-auto size-8 text-[#0A2540]" />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
    </div>
  );
}
