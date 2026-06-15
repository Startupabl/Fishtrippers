import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitListingReport } from "@/lib/admin.functions";

const REASONS = [
  { value: "inappropriate", label: "Inappropriate content or language" },
  { value: "scam", label: "Scams, fraud, or misleading information" },
  { value: "external_payment", label: "External payment or booking links" },
  { value: "copyright", label: "Copyright / IP violation" },
  { value: "other", label: "Other (Please specify)" },
] as const;

type ReasonValue = (typeof REASONS)[number]["value"];

export function ReportListingDialog({ listingId }: { listingId: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReasonValue | "">("");
  const [details, setDetails] = useState("");

  const submit = useServerFn(submitListingReport);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          listingId: listingId!,
          reasonCategory: reason as ReasonValue,
          customDetails: details.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Thank you for keeping our community safe");
      setOpen(false);
      setReason("");
      setDetails("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!listingId) return null;

  const canSubmit = !!reason && (reason !== "other" || details.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          <Flag className="size-3.5" /> Report listing
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>
            Help us keep the community safe. Reports are reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReasonValue)}>
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-start gap-2">
                <RadioGroupItem value={r.value} id={`report-${r.value}`} className="mt-1" />
                <Label htmlFor={`report-${r.value}`} className="cursor-pointer text-sm font-normal">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {reason === "other" && (
            <Textarea
              placeholder="Please describe the issue…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={4}
            />
          )}
          {reason && reason !== "other" && (
            <Textarea
              placeholder="Additional details (optional)…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
