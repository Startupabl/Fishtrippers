import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, XCircle, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getVerificationForOwner,
  getAdminVerificationDocUrl,
  setVerificationStatus,
} from "@/lib/admin-verifications.functions";

type DocSlot = {
  key: "id" | "license" | "insurance" | "vessel";
  column: "id_url" | "license_url" | "insurance_url" | "vessel_doc_url";
  title: string;
  helper: string;
  charterOnly?: boolean;
};

const SLOTS: DocSlot[] = [
  { key: "id", column: "id_url", title: "Identity Verification", helper: "Passport, Driver's License, or Government ID." },
  { key: "license", column: "license_url", title: "Professional Guide License", helper: "State/Region fishing guide license or marine certificate." },
  { key: "insurance", column: "insurance_url", title: "Liability Insurance", helper: "Commercial liability insurance certificate." },
  { key: "vessel", column: "vessel_doc_url", title: "Vessel Documentation", helper: "Vessel registration or Certificate of Survey.", charterOnly: true },
];

export function VerificationReviewDialog({
  open,
  onOpenChange,
  ownerId,
  ownerName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerId: string | null;
  ownerName: string;
}) {
  const qc = useQueryClient();
  const fetchRow = useServerFn(getVerificationForOwner);
  const getUrl = useServerFn(getAdminVerificationDocUrl);
  const setStatus = useServerFn(setVerificationStatus);
  const [opening, setOpening] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "verification", ownerId],
    queryFn: () => fetchRow({ data: { owner_id: ownerId! } }),
    enabled: !!ownerId && open,
  });

  const mutate = useMutation({
    mutationFn: (status: "Verified" | "Rejected") =>
      setStatus({ data: { user_id: ownerId!, status } }),
    onSuccess: (_d, status) => {
      toast.success(status === "Verified" ? "Verification approved" : "Verification rejected");
      void qc.invalidateQueries({ queryKey: ["admin", "verification", ownerId] });
      void qc.invalidateQueries({ queryKey: ["admin", "queue", "listings"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const row = q.data;
  const isCharter = row?.is_charter_owner ?? false;
  const visibleSlots = SLOTS.filter((s) => !s.charterOnly || isCharter);

  async function handleView(key: DocSlot["key"]) {
    if (!ownerId) return;
    setOpening(key);
    try {
      const res = await getUrl({ data: { user_id: ownerId, doc_type: key } });
      if (res?.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else toast.error("Document not available");
    } finally {
      setOpening(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verification documents — {ownerName}</DialogTitle>
          <DialogDescription>
            Review the uploaded credentials, then approve or reject.
          </DialogDescription>
        </DialogHeader>

        {q.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !row ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No verification record found.
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded-md bg-muted/40 p-3 text-sm">
              <span>
                Charter Boat Owner:{" "}
                <strong>{isCharter ? "Yes" : "No"}</strong>
              </span>
              <Badge variant="outline">{row.status}</Badge>
            </div>

            {visibleSlots.map((s) => {
              const path = row[s.column] as string | null;
              const has = !!path;
              return (
                <div
                  key={s.key}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{s.helper}</div>
                      <div className="mt-1 text-xs">
                        {has ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-3.5" /> Uploaded
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Missing</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!has || opening === s.key}
                    onClick={() => handleView(s.key)}
                  >
                    {opening === s.key ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="size-3.5" />
                    )}
                    View
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutate.isPending}>
            Close
          </Button>
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600"
            disabled={!row || mutate.isPending}
            onClick={() => mutate.mutate("Rejected")}
          >
            <XCircle className="size-4" /> Reject
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!row || mutate.isPending}
            onClick={() => mutate.mutate("Verified")}
          >
            <CheckCircle2 className="size-4" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
