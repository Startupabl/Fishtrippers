import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/data-handling")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "data-handling" } });
  },
});
