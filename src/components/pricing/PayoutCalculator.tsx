import { useState } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { usePlatformFee } from "@/hooks/usePlatformFee";
import { formatCurrency } from "@/lib/format-currency";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyMeta,
} from "@/lib/currency";
import type { CurrencyCode } from "@/stores/useCurrencyStore";

interface PayoutCalculatorProps {
  priceMajor: number;
  currency: CurrencyCode;
  onPriceChange: (next: number) => void;
  onCurrencyChange?: (next: CurrencyCode) => void;
  showCurrencyOverride?: boolean;
}

export function PayoutCalculator({
  priceMajor,
  currency,
  onPriceChange,
  onCurrencyChange,
  showCurrencyOverride = false,
}: PayoutCalculatorProps) {
  const [targetMode, setTargetMode] = useState(false);
  const [targetMajor, setTargetMajor] = useState<number>(0);
  const [showOverride, setShowOverride] = useState(false);

  const { rate, label: feeLabel, computeFee } = usePlatformFee();

  const symbol = getCurrencyMeta(currency).symbol;
  const grossMinor = Math.max(0, Math.round((priceMajor || 0) * 100));
  const { feeMinor, payoutMinor } = computeFee(grossMinor);

  function handlePriceInput(raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    const next = digits === "" ? 0 : Math.min(1000000, parseInt(digits, 10));
    onPriceChange(next);
  }

  function handleTargetInput(raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    const t = digits === "" ? 0 : Math.min(1000000, parseInt(digits, 10));
    setTargetMajor(t);
    const listingMajor = t === 0 ? 0 : Math.round(t / (1 - rate));
    onPriceChange(Math.min(1000000, listingMajor));
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-foreground">
          Total Course Price (Per-Person)
        </Label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-muted-foreground">
            {symbol}
          </span>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={priceMajor === 0 ? "" : String(priceMajor)}
            onChange={(e) => handlePriceInput(e.target.value)}
            placeholder={`e.g. ${symbol}100 per person`}
            className="rounded-xl pl-8"
            disabled={targetMode}
          />
        </div>

        {/* Live breakdown */}
        <div className="mt-3 rounded-2xl border border-border/60 bg-background/60 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Platform Fee ({feeLabel}):</span>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="What does the platform fee cover?"
                      className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                    ℹ️ This flat {feeLabel} fee covers secure international
                    payment processing, platform hosting, student customer
                    support, and marketing to help bring more learners to your
                    listings!
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span
              className="font-medium"
              style={{ color: "color-mix(in oklab, var(--destructive) 70%, var(--muted-foreground))" }}
            >
              −{formatCurrency(feeMinor, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              Your Estimated Take-Home Earnings:
            </span>
            <span
              className="text-base font-bold"
              style={{ color: DESIGN_SYSTEM.colors.accentGreen }}
            >
              {formatCurrency(payoutMinor, currency)} per person
            </span>
          </div>
        </div>
      </div>

      {/* Reverse mode toggle */}
      <div className="rounded-2xl border border-border/60 bg-background/40 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="target-profit-toggle" className="text-sm text-foreground cursor-pointer">
            💸 Price by Target Profit
          </Label>
          <Switch
            id="target-profit-toggle"
            checked={targetMode}
            onCheckedChange={(v) => {
              setTargetMode(v);
              if (!v) setTargetMajor(0);
            }}
          />
        </div>
        {targetMode && (
          <div>
            <Label className="text-xs text-muted-foreground">
              I want to take home
            </Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-muted-foreground">
                {symbol}
              </span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={targetMajor === 0 ? "" : String(targetMajor)}
                onChange={(e) => handleTargetInput(e.target.value)}
                placeholder={`e.g. ${symbol}100`}
                className="rounded-xl pl-8"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Listing price auto-set to{" "}
              <span className="font-medium text-foreground">
                {symbol}
                {priceMajor}
              </span>{" "}
              so you take home exactly {formatCurrency(targetMajor * 100, currency)}.
            </p>
          </div>
        )}
      </div>

      {/* Currency override */}
      {showCurrencyOverride && onCurrencyChange && (
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Showing in {currency} (auto-detected from your locale).
            </span>
            <button
              type="button"
              className="text-info hover:underline"
              onClick={() => setShowOverride((v) => !v)}
            >
              Change Currency
            </button>
          </div>
          {showOverride && (
            <div className="mt-3">
              <Select
                value={currency}
                onValueChange={(v) => onCurrencyChange(v as CurrencyCode)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
