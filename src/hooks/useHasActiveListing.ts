import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

type MyOperatorRow = {
  id: string;
  business_type: string | null;
  status: string | null;
  display_name: string | null;
};

function useMyOperatorQuery() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["my-operator", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyOperatorRow | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("operators")
        .select("id, business_type, status, display_name")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) return null;
      return (data as MyOperatorRow | null) ?? null;
    },
  });
}

/** Returns true when the signed-in user has an operator listing (draft or published). */
export function useHasActiveListing(): boolean {
  return useHasActiveListingStatus().hasListing;
}

/** Same check, plus whether the query has finished loading. */
export function useHasActiveListingStatus(): {
  hasListing: boolean;
  isLoaded: boolean;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isSuccess } = useMyOperatorQuery();
  const status = data?.status ?? null;
  const hasListing =
    !!data && (status === null || status === "draft" || status === "published");
  return { hasListing, isLoaded: !userId ? true : isSuccess };
}

export type OperatorRole = "captain" | "guide";

/**
 * Returns the role label for the signed-in operator.
 * - business_type === "guide" → guide
 * - anything else (charter, etc.) → captain
 * - defaults to "captain" while loading to avoid label flicker.
 */
export function useOperatorRoleLabel(): {
  role: OperatorRole;
  titleCase: "Captain" | "Guide";
} {
  const { data } = useMyOperatorQuery();
  const role: OperatorRole = data?.business_type === "guide" ? "guide" : "captain";
  return { role, titleCase: role === "guide" ? "Guide" : "Captain" };
}
