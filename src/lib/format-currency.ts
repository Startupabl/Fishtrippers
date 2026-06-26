// Single source of truth for displaying money across checkout, success page,
// and the booking-receipt mock email so the values always agree.

import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { convertMinor } from "./currency";

export function formatCurrency(
  minorUnits: number,
  currencyCode: string,
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en-US",
): string {
  const value = minorUnits / 100;
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currencyCode,
  };

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", options).format(value);
  }
}

/**
 * Convert a price from its source currency into the user-selected display
 * currency, then format. Use this in price-display sites that should respond
 * to the footer currency switcher. Call sites that must show a literal,
 * unconverted amount (e.g. the underlying mentor payout currency) should
 * keep using `formatCurrency` directly.
 *
 * Hook variant; subscribes to the store so swaps re-render.
 */
export function useFormattedPrice(
  minorUnits: number,
  from: CurrencyCode,
): string {
  const display = useCurrencyStore((s) => s.currency);
  const converted = convertMinor(minorUnits, from, display);
  return formatCurrency(converted, display);
}

/** Non-hook variant for one-off renders or templates outside React state. */
export function formatPrice(minorUnits: number, from: CurrencyCode): string {
  const display = useCurrencyStore.getState().currency;
  const converted = convertMinor(minorUnits, from, display);
  return formatCurrency(converted, display);
}
