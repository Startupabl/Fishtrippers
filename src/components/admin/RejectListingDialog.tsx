import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type ReasonKey =
  | "stripe_incomplete"
  | "external_links"
  | "unreasonable_pricing"
  | "missing_showcase"
  | "incomplete_session_details"
  | "poor_imagery"
  | "inappropriate_content"
  | "tos_noncompliance"
  | "custom";

const REASONS: { key: ReasonKey; label: string; text: string }[] = [
  {
    key: "stripe_incomplete",
    label: "Stripe Onboarding Incomplete",
    text: "Your listing cannot be approved because your Stripe Connect account is not fully setup or verified. To activate your listing and ensure you can seamlessly receive payouts, please visit your Profile Settings to complete your payment onboarding before resubmitting.",
  },
  {
    key: "external_links",
    label: "External Booking Links",
    text: "We noticed your listing contains external booking or payment links. To protect our community and ensure seamless scheduling, all classes, communication, and payments must happen entirely through FishTrippers.",
  },
  {
    key: "unreasonable_pricing",
    label: "Unreasonable Pricing",
    text: "The pricing for this course appears unusually high for our current marketplace benchmarks. To ensure your class gets booked and maintains platform accessibility, we recommend aligning your rates with standard market values or starting lower to build up your student reviews first.",
  },
  {
    key: "missing_showcase",
    label: "Missing Showcase / Portfolio",
    text: "Your course looks incredible! To give you the absolute best chance at scoring bookings and making your listing truly pop, we highly recommend adding 1-2 examples of your work to your Showcase Gallery. Showing students a quick visual sneak peek of what they'll create helps build trust instantly!",
  },
  {
    key: "incomplete_session_details",
    label: "Incomplete Session Details",
    text: "Your course description or individual session titles need a bit more detail. Please expand on your curriculum so students know exactly what value and milestones they are getting in each session.",
  },
  {
    key: "poor_imagery",
    label: "Poor Quality Imagery / Video",
    text: "The cover image or video assets provided are low-resolution, incorrectly cropped, or broken. Please upload high-quality, clear visuals to help your listing stand out.",
  },
  {
    key: "inappropriate_content",
    label: "Inappropriate Language / Content",
    text: "Your listing contains language, phrasing, or content that violates our community guidelines. Please review your text to ensure a professional and respectful learning environment.",
  },
  {
    key: "tos_noncompliance",
    label: "Terms of Service Non-Compliance",
    text: "This listing does not fully comply with our platform's Terms of Service or focuses on topics outside our approved AI tool categories. Please review your content before resubmitting.",
  },
  { key: "custom", label: "Custom Reason", text: "" },
];

export function RejectListingDialog({
  open,
  onOpenChange,
  listingTitle,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingTitle: string;
  onSubmit: (note: string, reasonKey: ReasonKey) => void;
  isSubmitting?: boolean;
}) {
  const [reasonKey, setReasonKey] = useState<ReasonKey | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (!open) {
      setReasonKey(null);
      setNoteText("");
    }
  }, [open]);

  const selected = useMemo(
    () => REASONS.find((r) => r.key === reasonKey) ?? null,
    [reasonKey],
  );

  function handleSelect(key: string) {
    const k = key as ReasonKey;
    setReasonKey(k);
    const found = REASONS.find((r) => r.key === k);
    setNoteText(found?.text ?? "");
  }

  const canSubmit = !!reasonKey && noteText.trim().length > 0 && !isSubmitting;

  function handleSubmit() {
    if (!canSubmit || !reasonKey) return;
    onSubmit(noteText.trim(), reasonKey);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Decline Listing: {listingTitle}</DialogTitle>
          <DialogDescription>
            Pick a reason. The mapped feedback is editable before sending — the
            Aide will receive it by email and as an onsite alert, and the
            listing will be sent back to draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <RadioGroup
            value={reasonKey ?? ""}
            onValueChange={handleSelect}
            className="space-y-1"
          >
            {REASONS.map((r) => (
              <label
                key={r.key}
                htmlFor={`reject-${r.key}`}
                className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-muted/50"
              >
                <RadioGroupItem id={`reject-${r.key}`} value={r.key} className="mt-0.5" />
                <span className="leading-snug">{r.label}</span>
              </label>
            ))}
          </RadioGroup>

          {selected && (
            <div className="space-y-1.5">
              <Label htmlFor="reject-note">
                {selected.key === "custom"
                  ? "Custom message to the Aide"
                  : "Message to the Aide (editable)"}
              </Label>
              <Textarea
                id="reject-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={
                  selected.key === "custom"
                    ? "Type your custom feedback for the Aide…"
                    : ""
                }
                rows={6}
                maxLength={2000}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm &amp; Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
