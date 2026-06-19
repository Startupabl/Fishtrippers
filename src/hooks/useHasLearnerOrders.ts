import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuthStore } from "@/stores/useAuthStore";
import { listMyOrdersLearner } from "@/lib/orders.functions";
import { listMyTripBookingsLearner } from "@/lib/trip-bookings.functions";

/** Returns true once the signed-in user has at least one paid learner order
 *  OR at least one confirmed trip booking. */
export function useHasLearnerOrders(): boolean {
  return useHasLearnerOrdersStatus().hasOrders;
}

export function useHasLearnerOrdersStatus(): {
  hasOrders: boolean;
  isLoaded: boolean;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const fetchOrders = useServerFn(listMyOrdersLearner);
  const fetchTripBookings = useServerFn(listMyTripBookingsLearner);
  const ordersQuery = useQuery({
    queryKey: ["learner-orders-count", userId],
    enabled: !!userId,
    queryFn: () => fetchOrders(),
  });
  const tripsQuery = useQuery({
    queryKey: ["learner-trip-bookings-count", userId],
    enabled: !!userId,
    queryFn: () => fetchTripBookings(),
  });
  const orderCount = ordersQuery.data?.length ?? 0;
  const tripCount = tripsQuery.data?.length ?? 0;
  return {
    hasOrders: orderCount > 0 || tripCount > 0,
    isLoaded: !!userId && ordersQuery.isFetched && tripsQuery.isFetched,
  };
}
