import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — superseded by /dashboard/upcoming-sessions.
export const Route = createFileRoute("/_authenticated/dashboard/bookings")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/upcoming-sessions" });
  },
  component: () => null,
});
