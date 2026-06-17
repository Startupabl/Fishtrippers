import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/how-it-works-hosts")({
  head: () => ({
    meta: [
      { title: "How it Works for Hosts — Fishtrippers" },
      { name: "description", content: "How charter captains and guides list, manage, and grow their business on Fishtrippers." },
      { property: "og:title", content: "How it Works for Hosts" },
      { property: "og:description", content: "How captains and guides grow their business on Fishtrippers." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="how-it-works-hosts" fallbackTitle="How it Works for Hosts" />
  ),
});
