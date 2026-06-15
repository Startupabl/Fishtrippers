import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/acceptable-use-policy")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "acceptable-use-policy" } });
  },
});
