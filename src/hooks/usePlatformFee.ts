import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPlatformFee } from "@/lib/platform-stripe.functions";
import { computeFeeBreakdown, feePctLabel } from "@/lib/fees";

const FALLBACK_PCT = 14.5;

export interface PlatformFeeHook {
  /** Decimal rate, e.g. 0.145 for 14.5%. */
  rate: number;
  /** Percent value, e.g. 14.5. */
  pct: number;
  /** Pre-formatted label, e.g. "14.5%". */
  label: string;
  /** Forward fee breakdown for a gross (minor units) amount. */
  computeFee: (grossMinor: number) => ReturnType<typeof computeFeeBreakdown>;
  isLoading: boolean;
}

/**
 * Reads the live admin-configured platform fee percentage from the backend.
 * Returns the 14.5% fallback synchronously while the query resolves so
 * SSR / first paint never shows an empty value.
 */
export function usePlatformFee(): PlatformFeeHook {
  const fetchFee = useServerFn(getPublicPlatformFee);
  const { data, isLoading } = useQuery({
    queryKey: ["platform-fee"],
    queryFn: () => fetchFee(),
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const pct = data?.pct ?? FALLBACK_PCT;
  const rate = pct / 100;

  return {
    rate,
    pct,
    label: feePctLabel(rate),
    computeFee: (grossMinor: number) => computeFeeBreakdown(grossMinor, rate),
    isLoading,
  };
}
