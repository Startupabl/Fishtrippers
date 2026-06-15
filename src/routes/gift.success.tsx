import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Check, Copy, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGiftCardsStore } from "@/stores/useGiftCardsStore";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

const searchSchema = z.object({
  code: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/gift/success")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [{ title: "Mission Briefing — Lemonaidely" }],
  }),
  component: GiftSuccessPage,
});

function GiftSuccessPage() {
  const { code } = Route.useSearch();
  const card = useGiftCardsStore((s) => (code ? s.cards[code] : null));
  const [copied, setCopied] = useState(false);

  if (!card) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl text-foreground" style={lora}>
          Gift not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          We couldn't find that gift card. It may have been cleared from this
          browser.
        </p>
        <Button asChild className="mt-6 rounded-2xl">
          <Link to="/gift">Back to gift cards</Link>
        </Button>
      </div>
    );
  }

  function copy() {
    navigator.clipboard.writeText(card!.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const amount = `$${(card.amountMinor / 100).toFixed(0)}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 10%, rgba(14,165,233,0.18) 0%, transparent 60%), radial-gradient(50% 40% at 85% 20%, rgba(16,185,129,0.18) 0%, transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex items-center gap-3 text-info">
          <Gift className="size-6" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Mission Briefing
          </span>
        </div>

        <h1 className="mt-3 text-4xl text-foreground md:text-5xl" style={lora}>
          Hey {card.recipient.name}!
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {card.fromName ? `${card.fromName} sent you ` : "You've received "}
          an {amount} Lemonaidely gift to spark your next AI journey.
        </p>

        {card.message && (
          <Card className="mt-6 rounded-2xl border-border/60 bg-card/60 p-5 text-foreground">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              "{card.message}"
            </p>
            {card.fromName && (
              <p className="mt-3 text-right text-xs text-muted-foreground">
                — {card.fromName}
              </p>
            )}
          </Card>
        )}

        <Card
          className="mt-8 rounded-3xl border border-white/50 bg-white/50 p-6 shadow-lg backdrop-blur-md md:p-8"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 text-info" />
            Your redemption code
          </div>
          <p
            className="mt-3 break-all font-mono text-3xl font-bold text-foreground md:text-4xl"
            style={lora}
          >
            {card.code}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={copy}
              variant="outline"
              className="rounded-full"
            >
              {copied ? (
                <>
                  <Check className="mr-2 size-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" /> Copy code
                </>
              )}
            </Button>
            <Button asChild variant="info" className="rounded-full">
              <Link to="/search">Browse Courses</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Apply this code at the journey checkout — the {amount} balance is
            deducted before any card is charged.
          </p>
        </Card>

        <div
          className="mt-6 rounded-2xl border border-info/30 bg-info/5 p-4 text-sm text-foreground"
        >
          <strong>Heads up:</strong> recipient email delivery is coming soon.
          For now, share the code above with {card.recipient.name} however
          you'd like — text, DM, handwritten card, the works.
        </div>

        <div className="mt-8 flex gap-3">
          <Button asChild variant="ghost">
            <Link to="/gift">Send another</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
