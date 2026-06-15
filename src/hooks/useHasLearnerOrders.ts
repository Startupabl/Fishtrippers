import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuthStore } from "@/stores/useAuthStore";
import { listMyOrdersLearner } from "@/lib/orders.functions";

/** Returns true once the signed-in user has at least one paid learner order. */
export function useHasLearnerOrders(): boolean {
  const userId = useAuthStore((s) => s.user?.id);
  const fetchOrders = useServerFn(listMyOrdersLearner);
  const { data } = useQuery({
    queryKey: ["learner-orders-count", userId],
    enabled: !!userId,
    queryFn: () => fetchOrders(),
  });
  return (data?.length ?? 0) > 0;
}

/** Same query, but also exposes whether the result has loaded yet. */
export function useHasLearnerOrdersStatus(): {
  hasOrders: boolean;
  isLoaded: boolean;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const fetchOrders = useServerFn(listMyOrdersLearner);
  const query = useQuery({
    queryKey: ["learner-orders-count", userId],
    enabled: !!userId,
    queryFn: () => fetchOrders(),
  });
  return {
    hasOrders: (query.data?.length ?? 0) > 0,
    isLoaded: !!userId && query.isFetched,
  };
}
