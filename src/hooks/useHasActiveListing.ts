import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

/** Returns true when the signed-in user has at least one draft or published listing. */
export function useHasActiveListing(): boolean {
  return useHasActiveListingStatus().hasListing;
}

/** Same check, plus whether the query has finished loading. */
export function useHasActiveListingStatus(): {
  hasListing: boolean;
  isLoaded: boolean;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isSuccess } = useQuery({
    queryKey: ["has-active-listing", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const { count, error } = await supabase
        .from("journeys")
        .select("id", { count: "exact", head: true })
        .eq("mentor_id", userId)
        .in("status", ["draft", "published"]);
      if (error) return false;
      return (count ?? 0) > 0;
    },
  });
  return { hasListing: !!data, isLoaded: !userId ? true : isSuccess };
}
