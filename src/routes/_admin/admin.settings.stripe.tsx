import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/settings/stripe")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/settings/payments" });
  },
});
