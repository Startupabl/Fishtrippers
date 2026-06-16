import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFxRates } from "@/lib/fx.functions";
import { setLiveFxRates } from "@/lib/currency";

export function useFxRates() {
  const fn = useServerFn(getFxRates);
  const q = useQuery({
    queryKey: ["fx-rates"],
    queryFn: () => fn(),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  useEffect(() => {
    if (q.data?.rates) setLiveFxRates(q.data.rates);
  }, [q.data]);
  return q;
}
