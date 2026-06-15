import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — superseded by /dashboard/learner.
export const Route = createFileRoute("/_authenticated/my-learning")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/learner" });
  },
  component: () => null,
});
