import { useState } from "react";
import { X, Tag, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  formatPromoCode,
  promoCodeSchema,
  formatDiscountLabel,
  type PromoDiscount,
} from "@/lib/promo";
import { useLessonPathsStore } from "@/stores/useLessonPathsStore";
import { useGiftCardsStore } from "@/stores/useGiftCardsStore";
import { convertMinor } from "@/lib/currency";
import type { CurrencyCode } from "@/stores/useCurrencyStore";
import { DESIGN_SYSTEM } from "@/lib/brand";

export interface AppliedGiftCard {
  code: string;
  amountMinor: number; // in selection currency
  currency: string;
}

interface Props {
  /** Currency of the cart (gift card USD value is converted into this). */
  currency: string;
  onApply: (
    discount: (PromoDiscount & { code: string }) | null,
  ) => void;
  onApplyGiftCard?: (gift: AppliedGiftCard | null) => void;
}

export function PromoCodeInput({ currency, onApply, onApplyGiftCard }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{
    code: string;
    discount: PromoDiscount;
  } | null>(null);
  const [appliedGift, setAppliedGift] = useState<AppliedGiftCard | null>(null);

  function handleApply() {
    setError(null);
    const raw = code.trim().toUpperCase();

    if (raw.startsWith("GIFT-")) {
      const card = useGiftCardsStore.getState().findByCode(raw);
      if (!card) {
        setError("That gift code isn't valid.");
        return;
      }
      if (card.redeemedAtIso || card.balanceMinor <= 0) {
        setError("That gift code has already been redeemed.");
        return;
      }
      const amountInCart = convertMinor(
        card.balanceMinor,
        "USD",
        currency as CurrencyCode,
      );
      const next: AppliedGiftCard = {
        code: card.code,
        amountMinor: amountInCart,
        currency,
      };
      setAppliedGift(next);
      onApplyGiftCard?.(next);
      setOpen(false);
      return;
    }

    const parsed = promoCodeSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }
    const paths = Object.values(useLessonPathsStore.getState().paths);
    const match = paths.find(
      (p) => p.promoCode?.active && p.promoCode.code === raw,
    );
    if (!match || !match.promoCode) {
      setError("That code isn't valid for this path.");
      return;
    }
    const next = { code: match.promoCode.code, discount: match.promoCode.discount };
    setApplied(next);
    onApply({ ...next.discount, code: next.code });
    setOpen(false);
  }

  function handleRemovePromo() {
    setApplied(null);
    setCode("");
    setError(null);
    onApply(null);
  }

  function handleRemoveGift() {
    setAppliedGift(null);
    setCode("");
    setError(null);
    onApplyGiftCard?.(null);
  }

  if (applied || appliedGift) {
    return (
      <div className="space-y-2">
        {applied && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{ backgroundColor: `${DESIGN_SYSTEM.colors.accentGreen}1a` }}
          >
            <span className="inline-flex items-center gap-2 text-foreground">
              <Tag className="size-4" style={{ color: DESIGN_SYSTEM.colors.accentGreen }} />
              <strong className="font-semibold">{applied.code}</strong>
              <span className="text-muted-foreground">
                · {formatDiscountLabel(applied.discount)}
              </span>
            </span>
            <button
              type="button"
              onClick={handleRemovePromo}
              aria-label="Remove promo code"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {appliedGift && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{ backgroundColor: `${DESIGN_SYSTEM.colors.primaryBlue}1a` }}
          >
            <span className="inline-flex items-center gap-2 text-foreground">
              <Gift className="size-4" style={{ color: DESIGN_SYSTEM.colors.primaryBlue }} />
              <strong className="font-semibold">{appliedGift.code}</strong>
              <span className="text-muted-foreground">· gift balance applied</span>
            </span>
            <button
              type="button"
              onClick={handleRemoveGift}
              aria-label="Remove gift card"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs underline-offset-2 hover:underline"
            style={{ color: DESIGN_SYSTEM.colors.primaryBlue }}
          >
            Add another code
          </button>
        ) : (
          <CodeEntry
            code={code}
            setCode={setCode}
            onApply={handleApply}
            onCancel={() => {
              setOpen(false);
              setError(null);
            }}
            error={error}
          />
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm underline-offset-2 hover:underline"
        style={{ color: DESIGN_SYSTEM.colors.primaryBlue }}
      >
        Have a promo or gift code?
      </button>
    );
  }

  return (
    <CodeEntry
      code={code}
      setCode={setCode}
      onApply={handleApply}
      onCancel={() => {
        setOpen(false);
        setError(null);
      }}
      error={error}
    />
  );
}

interface CodeEntryProps {
  code: string;
  setCode: (v: string) => void;
  onApply: () => void;
  onCancel: () => void;
  error: string | null;
}

function CodeEntry({ code, setCode, onApply, onCancel, error }: CodeEntryProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <Input
          autoFocus
          value={code}
          onChange={(e) => setCode(formatPromoCode(e.target.value))}
          placeholder="MARTHA20 or GIFT-XXXX-XXXX"
          className="min-h-12 rounded-2xl text-base tracking-wider"
          aria-label="Promo or gift code"
        />
        <Button
          type="button"
          onClick={onApply}
          disabled={code.length < 3}
          className="min-h-12 rounded-2xl"
        >
          Apply
        </Button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
