import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — superseded by /dashboard/upcoming-sessions.
// Earnings now live at /dashboard/earnings (separate page).
export const Route = createFileRoute(
  "/_authenticated/dashboard/earnings-bookings",
)({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/upcoming-sessions" });
  },
  component: () => null,
});
