import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCurrencies, type CurrencyRow } from "@/lib/currencies.functions";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

const FALLBACK: CurrencyRow[] = SUPPORTED_CURRENCIES.map((c, i) => ({
  code: c.code,
  name: c.label,
  symbol: c.symbol,
  flag: c.flag,
  sort_order: (i + 1) * 10,
}));

export function useCurrencies() {
  const fn = useServerFn(getCurrencies);
  const q = useQuery({
    queryKey: ["currencies"],
    queryFn: () => fn(),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  return { currencies: q.data?.currencies ?? FALLBACK, isLoading: q.isLoading };
}
