import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — superseded by /dashboard/learner/schedule.
export const Route = createFileRoute(
  "/_authenticated/dashboard/learner/upcoming-sessions",
)({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/learner/schedule" });
  },
  component: () => null,
});
