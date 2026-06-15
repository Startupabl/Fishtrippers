import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — superseded by /my-learning.
export const Route = createFileRoute("/_authenticated/dashboard/my-orders")({
  beforeLoad: () => {
    throw redirect({ to: "/my-learning" });
  },
  component: () => null,
});
