import { Button } from "@/components/ui/button";

interface ExpressPayProps {
  onPay: () => void;
  disabled?: boolean;
}

export function ApplePayButton({ onPay, disabled }: ExpressPayProps) {
  return (
    <Button
      type="button"
      onClick={onPay}
      disabled={disabled}
      className="min-h-12 w-full rounded-2xl bg-black text-white hover:bg-black/90"
    >
      <span className="text-base font-medium"> Pay</span>
    </Button>
  );
}

export function GooglePayButton({ onPay, disabled }: ExpressPayProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onPay}
      disabled={disabled}
      className="min-h-12 w-full rounded-2xl border-foreground/30 text-foreground"
    >
      <span className="text-base font-medium">G Pay</span>
    </Button>
  );
}
