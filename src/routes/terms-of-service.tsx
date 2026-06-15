import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/terms-of-service")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "terms-of-service" } });
  },
});
