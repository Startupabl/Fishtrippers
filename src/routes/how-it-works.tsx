import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/how-it-works")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "how-it-works" } });
  },
});
