import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { getImpersonationState, stopImpersonation } from "@/lib/impersonation";

export function ImpersonationBanner() {
  const router = useRouter();
  const [state, setState] = useState(() => getImpersonationState());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(getImpersonationState());
    const onStorage = () => setState(getImpersonationState());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!state) return null;

  const handleSwitchBack = async () => {
    setBusy(true);
    try {
      const adminId = await stopImpersonation();
      setState(null);
      toast.success("Back to admin");
      if (adminId) {
        router.navigate({
          to: "/admin/users/$userId",
          params: { userId: state.target_user_id },
        });
      } else {
        router.navigate({ to: "/admin/users" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to switch back");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-lime-300 bg-lime-100 px-4 py-2 text-sm text-lime-900">
      <span className="font-medium">
        You are impersonating{state.target_email ? ` ${state.target_email}` : " this user"}.
      </span>
      <button
        onClick={handleSwitchBack}
        disabled={busy}
        className="rounded bg-lime-700 px-3 py-1 text-xs font-semibold text-white hover:bg-lime-800 disabled:opacity-50"
      >
        {busy ? "Switching…" : "Switch back to admin"}
      </button>
    </div>
  );
}
