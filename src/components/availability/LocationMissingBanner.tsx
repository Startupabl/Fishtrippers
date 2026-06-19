import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Warns the signed-in Aide when their profile is missing Country or Time Zone,
 * so learners can correctly interpret the availability grid across borders.
 *
 * Hides itself automatically once both fields are set.
 */
export function LocationMissingBanner({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("country, timezone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const hasCountry = !!data?.country && String(data.country).trim().length > 0;
        const hasTz = !!data?.timezone && String(data.timezone).trim().length > 0;
        setMissing(!hasCountry || !hasTz);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!loaded || !missing) return null;

  return (
    <div
      role="alert"
      className={
        "flex items-start gap-3 rounded-xl border-2 p-4 text-sm " +
        "border-[#E8B547] bg-[#FFF7E0] text-foreground " +
        (className ?? "")
      }
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#B45309]" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">⚠️ Action Required</p>
        <p className="mt-1">
          Please set your Country and Time Zone in your Profile Settings so
          students know when you are available across borders.{" "}
          <Link
            to="/settings/profile"
            className="font-semibold underline underline-offset-2 hover:opacity-80"
          >
            👉 Update Profile Settings
          </Link>
        </p>
      </div>
    </div>
  );
}
