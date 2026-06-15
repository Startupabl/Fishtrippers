import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";

// /dashboard/aide root redirects to /dashboard (the Aide workspace home).
// Children like /dashboard/aide/courses still render normally.
export const Route = createFileRoute("/_authenticated/dashboard/aide")({
  component: AideLegacyLayout,
});

function AideLegacyLayout() {
  const { pathname } = useLocation();
  if (pathname === "/dashboard/aide" || pathname === "/dashboard/aide/") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
