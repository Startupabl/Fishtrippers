import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ShieldCheck,
  Upload,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getMyVerification,
  upsertVerification,
  getVerificationDocSignedUrl,
  type VerificationRow,
} from "@/lib/verifications.functions";
import {
  uploadVerificationDoc,
  VERIFICATION_ACCEPT,
  type VerificationDocType,
} from "@/lib/verification-upload";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export const Route = createFileRoute("/_authenticated/dashboard/verifications")({
  head: () => ({
    meta: [
      { title: "My Verifications — FishTrippers" },
      {
        name: "description",
        content: "Upload your credentials to earn your Verified badge.",
      },
    ],
  }),
  component: VerificationsPage,
});

type DocConfig = {
  key: VerificationDocType;
  column: keyof VerificationRow;
  title: string;
  helper: string;
  charterOnly?: boolean;
};

const DOCS: DocConfig[] = [
  {
    key: "id",
    column: "id_url",
    title: "Identity Verification",
    helper: "Passport, Driver's License, or Government ID.",
  },
  {
    key: "license",
    column: "license_url",
    title: "Professional Guide License",
    helper: "State/Region fishing guide license or marine certificate.",
  },
  {
    key: "insurance",
    column: "insurance_url",
    title: "Liability Insurance",
    helper: "Commercial liability insurance certificate.",
  },
  {
    key: "vessel",
    column: "vessel_doc_url",
    title: "Vessel Documentation",
    helper: "Vessel registration or Certificate of Survey.",
    charterOnly: true,
  },
];

function statusBadge(status: VerificationRow["status"] | undefined) {
  const s = status ?? "Pending Verification";
  const map: Record<string, string> = {
    "Pending Verification": "bg-muted text-foreground",
    "Documents Uploaded": "bg-blue-100 text-blue-900",
    Verified: "bg-emerald-100 text-emerald-900",
    Rejected: "bg-red-100 text-red-900",
  };
  return <Badge className={`${map[s]} border-0`}>{s}</Badge>;
}

function VerificationsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fetchVerification = useServerFn(getMyVerification);
  const saveVerification = useServerFn(upsertVerification);
  const getSignedUrl = useServerFn(getVerificationDocSignedUrl);

  const { data, isLoading } = useQuery({
    queryKey: ["my-verification"],
    queryFn: () => fetchVerification(),
  });

  const isCharter = data?.is_charter_owner ?? false;

  const toggleCharter = useMutation({
    mutationFn: (val: boolean) =>
      saveVerification({ data: { is_charter_owner: val } }),
    onSuccess: (row) => {
      qc.setQueryData(["my-verification"], row);
      qc.invalidateQueries({ queryKey: ["my-operator"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  const visibleDocs = useMemo(
    () => DOCS.filter((d) => !d.charterOnly || isCharter),
    [isCharter],
  );

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100">
          <ShieldCheck className="size-5 text-amber-900" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
            My Verifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Please upload the following to verify your account:
          </p>
        </div>
        <div>{statusBadge(data?.status)}</div>
      </div>

      <Card className="mt-6 rounded-2xl border-border/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="charter-toggle" className="text-base font-semibold">
              Are you a Charter Boat Owner?
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              If yes, you&apos;ll also need to upload Vessel Documentation.
            </p>
          </div>
          <Switch
            id="charter-toggle"
            checked={isCharter}
            disabled={isLoading || toggleCharter.isPending}
            onCheckedChange={(v) => toggleCharter.mutate(v)}
          />
        </div>
      </Card>

      <div className="mt-6 grid gap-4">
        {visibleDocs.map((d) => (
          <UploadRow
            key={d.key}
            doc={d}
            userId={user?.id ?? null}
            existingPath={(data?.[d.column] as string | null) ?? null}
            onUploaded={async (path) => {
              const row = await saveVerification({
                data: { doc_type: d.key, storage_path: path },
              });
              qc.setQueryData(["my-verification"], row);
              qc.invalidateQueries({ queryKey: ["my-operator"] });
              toast.success(`${d.title} uploaded`);
            }}
            onView={async () => {
              const res = await getSignedUrl({ data: { doc_type: d.key } });
              if (res?.url) window.open(res.url, "_blank", "noopener,noreferrer");
              else toast.error("Could not open document");
            }}
          />
        ))}
      </div>
    </div>
  );
}

function UploadRow({
  doc,
  userId,
  existingPath,
  onUploaded,
  onView,
}: {
  doc: DocConfig;
  userId: string | null;
  existingPath: string | null;
  onUploaded: (path: string) => Promise<void>;
  onView: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasFile = !!existingPath;

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setUploading(true);
    try {
      const path = await uploadVerificationDoc(file, userId, doc.key);
      await onUploaded(path);
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{doc.title}</h3>
              <Badge variant="outline" className="text-[10px]">
                Required
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              {hasFile ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> File uploaded
                </span>
              ) : (
                <span className="text-muted-foreground">No file</span>
              )}
              {hasFile && (
                <button
                  type="button"
                  onClick={onView}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View <ExternalLink className="size-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end">
          <Button
            type="button"
            size="sm"
            variant={hasFile ? "outline" : "default"}
            onClick={handlePick}
            disabled={uploading || !userId}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                {hasFile ? "Replace file" : "Upload"}
              </>
            )}
          </Button>
          <p className="mt-2 max-w-[260px] text-right text-xs text-muted-foreground sm:text-right">
            {doc.helper}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={VERIFICATION_ACCEPT}
            onChange={handleChange}
            className="hidden"
          />
        </div>
      </div>
    </Card>
  );
}
