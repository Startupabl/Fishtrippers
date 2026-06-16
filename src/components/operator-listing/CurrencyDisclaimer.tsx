interface Props {
  baseCurrency: string;
  displayCurrency: string;
  className?: string;
}

/**
 * Tiny disclaimer shown near converted prices. Renders nothing when the
 * viewer's currency matches the operator's base currency.
 */
export function CurrencyDisclaimer({ baseCurrency, displayCurrency, className }: Props) {
  if (!baseCurrency || baseCurrency.toUpperCase() === displayCurrency.toUpperCase()) {
    return null;
  }
  return (
    <p className={`text-[11px] leading-snug text-muted-foreground ${className ?? ""}`}>
      Prices shown in {displayCurrency} are converted from {baseCurrency} at
      today&apos;s ECB rate. Final charge will be in {baseCurrency}.
    </p>
  );
}
