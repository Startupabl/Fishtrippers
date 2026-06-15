import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import type { CustomOffer, OfferStatus } from "@/stores/useChatStore";
import { usePlatformFee } from "@/hooks/usePlatformFee";

interface OfferBubbleProps {
  offer: CustomOffer;
  status: OfferStatus;
  viewerIsMentor: boolean;
  onAccept?: () => void;
}

export function OfferBubble({
  offer,
  status,
  viewerIsMentor,
  onAccept,
}: OfferBubbleProps) {
  const display = useCurrencyStore((s) => s.currency);
  const { label: feeLabel } = usePlatformFee();
  const fmt = formatCurrency(
    convertMinor(offer.priceMinor, offer.currency as CurrencyCode, display),
    display,
  );

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-info/30 bg-info/5 p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-info">
        <Sparkles className="size-4 shrink-0" />
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">Custom Offer</span>
      </div>
      <p className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]">{offer.description}</p>
      <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-background/60 px-3 py-2 text-sm">
        <span className="min-w-0 break-words text-muted-foreground [overflow-wrap:anywhere]">
          {offer.sessions} {offer.sessions === 1 ? "session" : "sessions"}
        </span>
        <span className="min-w-0 break-words text-right text-lg font-semibold text-foreground [overflow-wrap:anywhere]">{fmt}</span>
      </div>

      {status === "accepted" ? (
        <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" /> <span className="min-w-0">Accepted</span>
        </div>
      ) : status === "declined" ? (
        <div className="mt-3 min-w-0 text-sm text-muted-foreground">Declined</div>
      ) : viewerIsMentor ? (
        <p className="mt-3 min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Waiting for the learner to accept. Includes {feeLabel} platform service fee.
        </p>
      ) : (
        <Button onClick={onAccept} variant="info" className="mt-3 min-w-0 w-full whitespace-normal break-words [overflow-wrap:anywhere]">
          Accept &amp; Pay
        </Button>
      )}
    </div>
  );
}
