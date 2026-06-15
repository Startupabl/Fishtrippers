import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export interface ProfileCompletionState {
  isComplete: boolean;
  isLoading: boolean;
  missing: {
    firstName: boolean;
    lastName: boolean;
    timezone: boolean;
    avatar: boolean;
  };
}

export function useProfileCompletion(): ProfileCompletionState {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["profile-completion", user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, timezone, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const missing = {
    firstName: !data?.first_name?.trim(),
    lastName: !data?.last_name?.trim(),
    timezone: !data?.timezone?.trim(),
    avatar: !data?.avatar_url,
  };
  const isComplete =
    !!user && !isLoading && !missing.firstName && !missing.lastName && !missing.timezone && !missing.avatar;

  return { isComplete, isLoading: isLoading || !user, missing };
}
