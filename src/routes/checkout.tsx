import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ReviewYourPath } from "@/components/checkout/ReviewYourPath";
import { PaymentPanel } from "@/components/checkout/PaymentPanel";
import {
  useCheckoutStore,
  type CheckoutSelection,
} from "@/stores/useCheckoutStore";
import { useBookingsStore } from "@/stores/useBookingsStore";
import { useEarningsStore } from "@/stores/useEarningsStore";
import { useChatStore } from "@/stores/useChatStore";
import { useGiftCardsStore } from "@/stores/useGiftCardsStore";
import { useFormattedPrice } from "@/lib/format-currency";
import type { CurrencyCode } from "@/stores/useCurrencyStore";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

const DEMO_SELECTION: CheckoutSelection = {
  pathId: "demo-path",
  mentorId: "mentor-aria",
  mentorName: "Aria Chen",
  mentorAvatarUrl: "",
  pathTitle: "Build with ChatGPT: From Prompt to Product",
  highlights: [
    "Live 1:1 session with structured weekly goals",
    "Hands-on prompt engineering for your real workflows",
    "Custom GPT setup for your team or business",
  ],
  priceMinor: 12000,
  currency: "USD",
  sessionDateIso: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
  sessionTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function CheckoutPage() {
  const navigate = useNavigate();
  const selection = useCheckoutStore((s) => s.selection);
  const setSelection = useCheckoutStore((s) => s.setSelection);
  const clear = useCheckoutStore((s) => s.clear);
  const addBooking = useBookingsStore((s) => s.addBooking);
  const addEarning = useEarningsStore((s) => s.add);
  const setOfferStatus = useChatStore((s) => s.setOfferStatus);

  // V1 preview convenience: if landed on /checkout with no draft, seed a demo.
  useEffect(() => {
    if (!selection) setSelection(DEMO_SELECTION);
  }, [selection, setSelection]);

  const totalPriceMinor = selection?.priceMinor ?? 0;
  const journeyPrice = useFormattedPrice(
    totalPriceMinor,
    (selection?.currency ?? "USD") as CurrencyCode,
  );

  if (!selection) return null;


  const handlePay = async (ctx: { promoCode?: string | null; giftCardCode?: string | null }) => {
    await sleep(1200);
    const bookingId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `bk_${Date.now()}`;
    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sn_${Date.now()}`;

    addBooking({
      bookingId,
      sessionId,
      pathId: selection.pathId,
      pathTitle: selection.pathTitle,
      mentorId: selection.mentorId,
      mentorName: selection.mentorName,
      mentorAvatarUrl: selection.mentorAvatarUrl,
      highlights: selection.highlights,
      sessionDateIso: selection.sessionDateIso,
      sessionTimezone: selection.sessionTimezone,
      priceMinor: totalPriceMinor,
      currency: selection.currency,
      createdAtIso: new Date().toISOString(),
    });

    addEarning({
      kind: selection.customOffer ? "custom_offer" : "journey",
      label: selection.pathTitle,
      mentorName: selection.mentorName,
      grossMinor: selection.priceMinor,
      currency: selection.currency,
    });
    if (selection.customOffer) {
      setOfferStatus(
        selection.customOffer.threadId,
        selection.customOffer.messageId,
        "accepted",
      );
    }

    // Redeem gift card if applied (V1: full balance consumed)
    if (ctx.giftCardCode) {
      useGiftCardsStore.getState().redeem(ctx.giftCardCode);
    }

    clear();
    navigate({ to: "/journey-welcome", search: { bookingId } });
  };

  const journeyPrice = useFormattedPrice(
    totalPriceMinor,
    selection.currency as CurrencyCode,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 md:px-8 py-4">
          <Logo size="md" />
          <Button
            variant="ghost"
            className="rounded-2xl"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 md:px-8 py-8 md:py-12">
        <p className="mb-6 rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-foreground">
          You are starting your Aide-led Course for{" "}
          <strong className="font-semibold">{journeyPrice}</strong>.
        </p>
        <div className="grid gap-8 lg:grid-cols-[1fr_440px]">
          <ReviewYourPath selection={selection} />
          <PaymentPanel
            priceMinor={totalPriceMinor}
            currency={selection.currency}
            onPay={handlePay}
          />
        </div>
      </main>
    </div>
  );
}
