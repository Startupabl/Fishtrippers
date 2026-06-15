import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/trust-and-safety")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "trust-and-safety" } });
  },
});
