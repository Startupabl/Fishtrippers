import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Loader2, Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { giftDetailsSchema, type GiftDetails } from "@/lib/gift-codes";
import { useGiftCardsStore } from "@/stores/useGiftCardsStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { DESIGN_SYSTEM } from "@/lib/brand";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: { name: string; amount: number } | null;
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

export function GiftCheckoutDialog({ open, onOpenChange, tier }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const purchase = useGiftCardsStore((s) => s.purchase);

  const [step, setStep] = useState<"details" | "payment">("details");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<GiftDetails>({
    resolver: zodResolver(giftDetailsSchema),
    mode: "onChange",
    defaultValues: {
      recipientName: "",
      recipientEmail: "",
      message: "",
      fromName: user?.firstName ?? "",
    },
  });

  function reset() {
    setStep("details");
    setSubmitting(false);
    form.reset({
      recipientName: "",
      recipientEmail: "",
      message: "",
      fromName: user?.firstName ?? "",
    });
  }

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) setTimeout(reset, 150);
  }

  async function handlePay(values: GiftDetails) {
    if (!tier) return;
    setSubmitting(true);
    try {
      await sleep(1100);
      const card = purchase({
        amountMinor: tier.amount * 100,
        recipient: {
          name: values.recipientName,
          email: values.recipientEmail,
        },
        message: values.message ?? "",
        fromName: values.fromName ?? undefined,
      });
      onOpenChange(false);
      navigate({
        to: "/gift/success",
        search: { code: card.code },
      } as never);
    } finally {
      setSubmitting(false);
    }
  }

  if (!tier) return null;

  const priceLabel = `$${tier.amount}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto bg-background p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <DialogTitle
              className="text-2xl text-foreground"
              style={{ fontFamily: DESIGN_SYSTEM.fonts.serif }}
            >
              {tier.name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {step === "details"
                ? "Who's this gift for?"
                : "Confirm payment to send the gift code."}
            </DialogDescription>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-base font-bold"
            style={{ fontFamily: DESIGN_SYSTEM.fonts.serif }}
          >
            {priceLabel}
          </Badge>
        </div>

        {step === "details" ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit(() => setStep("payment"))}
            noValidate
          >
            <div>
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input
                id="recipientName"
                placeholder="Boo Boo"
                className="mt-1.5 h-12 rounded-2xl"
                {...form.register("recipientName")}
              />
              {form.formState.errors.recipientName && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.recipientName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="recipientEmail">Recipient email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="friend@example.com"
                className="mt-1.5 h-12 rounded-2xl"
                {...form.register("recipientEmail")}
              />
              {form.formState.errors.recipientEmail && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.recipientEmail.message}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                We'll show the gift code on the next page so you can share it.
                Recipient email delivery is coming soon.
              </p>
            </div>

            <div>
              <Label htmlFor="fromName">From (optional)</Label>
              <Input
                id="fromName"
                placeholder="Your name"
                className="mt-1.5 h-12 rounded-2xl"
                {...form.register("fromName")}
              />
            </div>

            <div>
              <Label htmlFor="message">Add a note (optional)</Label>
              <Textarea
                id="message"
                rows={4}
                maxLength={500}
                placeholder="I thought you'd love learning AI with an Aide!"
                className="mt-1.5 rounded-2xl"
                {...form.register("message")}
              />
              {form.formState.errors.message && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.message.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-2xl"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="info"
                disabled={!form.formState.isValid}
                className="h-12 flex-1 rounded-2xl text-base font-semibold"
              >
                Continue to Payment
              </Button>
            </div>
          </form>
        ) : (
          <PaymentStep
            priceLabel={priceLabel}
            submitting={submitting}
            onBack={() => setStep("details")}
            onPay={() => form.handleSubmit(handlePay)()}
          />
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="size-3" />
          Secure checkout · Demo mode · no real charge
        </p>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentStepProps {
  priceLabel: string;
  submitting: boolean;
  onBack: () => void;
  onPay: () => void;
}

function PaymentStep({
  priceLabel,
  submitting,
  onBack,
  onPay,
}: PaymentStepProps) {
  return (
    <div className="mt-6 space-y-4">
      <div
        className="rounded-2xl border border-info/30 bg-info/5 p-4 text-sm text-foreground"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-info" />
          Your LemonAIdely Gift Code is ready to send
        </span>
        <p className="mt-1 text-muted-foreground">
          Delivered instantly via email — like a digital invite to a mission.
        </p>
      </div>

      <div>
        <Label htmlFor="gift-card-number">Card number</Label>
        <div className="relative mt-1.5">
          <CreditCard className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="gift-card-number"
            placeholder="4242 4242 4242 4242"
            className="h-12 rounded-2xl pl-11 tracking-wider"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="gift-exp">Expiry</Label>
          <Input id="gift-exp" placeholder="MM/YY" className="mt-1.5 h-12 rounded-2xl" />
        </div>
        <div>
          <Label htmlFor="gift-cvc">CVC</Label>
          <Input id="gift-cvc" placeholder="123" className="mt-1.5 h-12 rounded-2xl" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="h-12 rounded-2xl"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onPay}
          disabled={submitting}
          variant="money"
          className="h-12 flex-1 rounded-2xl text-base font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>Pay {priceLabel} & Send Gift</>
          )}
        </Button>
      </div>
    </div>
  );
}
