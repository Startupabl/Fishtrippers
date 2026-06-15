import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/payouts")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/billing" });
  },
});
