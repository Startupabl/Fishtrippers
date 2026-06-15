import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/about-us")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "about-us" } });
  },
});
