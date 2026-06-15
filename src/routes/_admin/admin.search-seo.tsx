import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/search-seo")({
  component: () => <Outlet />,
});
