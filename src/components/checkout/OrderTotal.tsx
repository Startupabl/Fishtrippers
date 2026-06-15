import { ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

interface OrderTotalProps {
  priceMinor: number;
  currency: string;
  discount?: { label: string; amountMinor: number };
  giftCard?: { code: string; amountMinor: number };
}

export function OrderTotal({
  priceMinor,
  currency,
  discount,
  giftCard,
}: OrderTotalProps) {
  const afterPromo = discount
    ? Math.max(0, priceMinor - discount.amountMinor)
    : priceMinor;
  const giftApplied = giftCard ? Math.min(giftCard.amountMinor, afterPromo) : 0;
  const total = Math.max(0, afterPromo - giftApplied);

  const display = useCurrencyStore((s) => s.currency);
  const fmt = (m: number) =>
    formatCurrency(convertMinor(m, currency as CurrencyCode, display), display);

  return (
    <div className="rounded-2xl bg-muted/40 p-4">
      <div className="flex items-center justify-between text-sm text-foreground">
        <span>Lesson</span>
        <span>{fmt(priceMinor)}</span>
      </div>
      {discount && (
        <div
          className="mt-2 flex items-center justify-between text-sm"
          style={{ color: DESIGN_SYSTEM.colors.accentGreen }}
        >
          <span>Promo · {discount.label}</span>
          <span>−{fmt(discount.amountMinor)}</span>
        </div>
      )}
      {giftCard && giftApplied > 0 && (
        <div
          className="mt-2 flex items-center justify-between text-sm"
          style={{ color: DESIGN_SYSTEM.colors.primaryBlue }}
        >
          <span>Gift card · {giftCard.code}</span>
          <span>−{fmt(giftApplied)}</span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-sm text-foreground">
        <span>Platform fee</span>
        <span className="text-muted-foreground">Included</span>
      </div>
      <Separator className="my-3" />
      <div className="flex items-end justify-between">
        <span className="text-sm text-muted-foreground">Total to Pay</span>
        <span className="text-2xl text-foreground" style={lora}>
          {fmt(total)}
        </span>
      </div>
      <div
        className="mt-3 flex items-center gap-2 text-xs"
        style={{ color: DESIGN_SYSTEM.colors.primaryBlue }}
      >
        <ShieldCheck className="size-4" />
        <span>No hidden fees. Cancel free up to 24h before your first lesson.</span>
      </div>
    </div>
  );
}
