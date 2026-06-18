import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/create-listing")({
  head: () => ({
    meta: [
      { title: "Create a Listing — Fishtrippers" },
      { name: "description", content: "List your charter, guide service, or fishing experience on Fishtrippers." },
      { property: "og:title", content: "Create a Listing on Fishtrippers" },
      { property: "og:description", content: "List your charter, guide service, or fishing experience." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="create-listing" fallbackTitle="Create a Listing" fallbackDescription="List your charter, guide service, or fishing experience on Fishtrippers." />
  ),
});
