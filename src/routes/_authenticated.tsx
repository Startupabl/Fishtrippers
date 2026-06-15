import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [initialized, user, navigate]);

  if (!initialized) return null;
  if (!user) return null;
  return <Outlet />;
}
