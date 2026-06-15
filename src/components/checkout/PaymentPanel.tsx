import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Lock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ApplePayButton, GooglePayButton } from "./ExpressPayButtons";
import { OrderTotal } from "./OrderTotal";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { PromoCodeInput, type AppliedGiftCard } from "./PromoCodeInput";
import { applyDiscount, formatDiscountLabel, type PromoDiscount } from "@/lib/promo";

function luhn(num: string): boolean {
  const digits = num.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const schema = z.object({
  cardholder: z.string().trim().min(2, "Required").max(100),
  cardNumber: z
    .string()
    .refine((v) => luhn(v), { message: "Invalid card number" }),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "MM/YY")
    .refine((v) => {
      const [mm, yy] = v.split("/").map((s) => parseInt(s, 10));
      const exp = new Date(2000 + yy, mm, 0, 23, 59, 59);
      return exp.getTime() > Date.now();
    }, "Expired"),
  cvc: z.string().regex(/^\d{3,4}$/, "3–4 digits"),
  zip: z.string().trim().min(3, "Required").max(12),
});

type FormValues = z.infer<typeof schema>;

interface PaymentPanelProps {
  priceMinor: number;
  currency: string;
  onPay: (ctx: {
    promoCode?: string | null;
    giftCardCode?: string | null;
  }) => Promise<void>;
}

function formatCardNumber(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function PaymentPanel({ priceMinor, currency, onPay }: PaymentPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<
    (PromoDiscount & { code: string }) | null
  >(null);
  const [appliedGift, setAppliedGift] = useState<AppliedGiftCard | null>(null);
  const promoDiscountedMinor = appliedPromo
    ? applyDiscount(priceMinor, appliedPromo)
    : priceMinor;
  const discountAmountMinor = priceMinor - promoDiscountedMinor;
  const giftMinor = appliedGift
    ? Math.min(appliedGift.amountMinor, promoDiscountedMinor)
    : 0;
  const finalMinor = Math.max(0, promoDiscountedMinor - giftMinor);
  const display = useCurrencyStore((s) => s.currency);
  const payLabelAmount = formatCurrency(
    convertMinor(finalMinor, currency as CurrencyCode, display),
    display,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      cardholder: "",
      cardNumber: "",
      expiry: "",
      cvc: "",
      zip: "",
    },
  });

  const runPay = async () => {
    setSubmitting(true);
    try {
      await onPay({
        promoCode: appliedPromo?.code ?? null,
        giftCardCode: appliedGift?.code ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = form.handleSubmit(runPay);
  const fullyCovered = finalMinor === 0;

  return (
    <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8">
      <div className="flex items-center justify-between">
        <Badge
          variant="secondary"
          className="rounded-full"
          style={{
            backgroundColor: `${DESIGN_SYSTEM.colors.primaryBlue}1a`,
            color: DESIGN_SYSTEM.colors.primaryBlue,
          }}
        >
          <Lock className="mr-1 size-3" />
          Secure checkout · Demo mode
        </Badge>
      </div>

      <div className="mt-6 grid gap-3">
        <ApplePayButton onPay={runPay} disabled={submitting} />
        <GooglePayButton onPay={runPay} disabled={submitting} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        <span>or pay with card</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="cardholder">Cardholder name</Label>
          <Input
            id="cardholder"
            className="mt-1.5 min-h-14 rounded-2xl text-base"
            autoComplete="cc-name"
            {...form.register("cardholder")}
          />
          {form.formState.errors.cardholder && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.cardholder.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="cardNumber">Card number</Label>
          <div className="relative mt-1.5">
            <CreditCard className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cardNumber"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              className="min-h-14 rounded-2xl pl-11 text-base tracking-wider"
              {...form.register("cardNumber", {
                onChange: (e) => {
                  e.target.value = formatCardNumber(e.target.value);
                },
              })}
            />
          </div>
          {form.formState.errors.cardNumber && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.cardNumber.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="expiry">Expiry (MM/YY)</Label>
            <Input
              id="expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className="mt-1.5 min-h-14 rounded-2xl text-base"
              {...form.register("expiry", {
                onChange: (e) => {
                  e.target.value = formatExpiry(e.target.value);
                },
              })}
            />
            {form.formState.errors.expiry && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.expiry.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="cvc">CVC</Label>
            <Input
              id="cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              className="mt-1.5 min-h-14 rounded-2xl text-base"
              {...form.register("cvc")}
            />
            {form.formState.errors.cvc && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.cvc.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="zip">Billing ZIP / Postal code</Label>
          <Input
            id="zip"
            autoComplete="postal-code"
            className="mt-1.5 min-h-14 rounded-2xl text-base"
            {...form.register("zip")}
          />
          {form.formState.errors.zip && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.zip.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <PromoCodeInput
            currency={currency}
            onApply={setAppliedPromo}
            onApplyGiftCard={setAppliedGift}
          />
        </div>

        <div className="pt-2">
          <OrderTotal
            priceMinor={priceMinor}
            currency={currency}
            discount={
              appliedPromo
                ? {
                    label: formatDiscountLabel(appliedPromo),
                    amountMinor: discountAmountMinor,
                  }
                : undefined
            }
            giftCard={
              appliedGift
                ? { code: appliedGift.code, amountMinor: giftMinor }
                : undefined
            }
          />
        </div>

        <Button
          type="submit"
          variant="money"
          disabled={submitting || (!fullyCovered && !form.formState.isValid)}
          className="min-h-12 w-full rounded-2xl text-base font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Processing…
            </>
          ) : fullyCovered ? (
            <>Confirm — fully covered by gift card</>
          ) : (
            <>Pay {payLabelAmount} & Reserve</>
          )}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lock className="size-3" />
            256-bit encrypted
          </span>
          <span>· PCI-DSS aligned</span>
          <span>· Demo · no real charge</span>
        </div>
      </form>
    </Card>
  );
}
