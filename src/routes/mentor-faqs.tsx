import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy redirect → unified /pages/:slug template.
export const Route = createFileRoute("/mentor-faqs")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "mentor-faqs" } });
  },
});
