import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/become-an-aide")({
  beforeLoad: () => {
    throw redirect({ to: "/pages/$slug", params: { slug: "become-a-mentor" } });
  },
});
