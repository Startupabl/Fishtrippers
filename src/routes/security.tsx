import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/security")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "security" } });
  },
});
