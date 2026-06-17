import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Fishtrippers" },
      { name: "description", content: "Learn more about Fishtrippers — the marketplace connecting anglers with trusted charter captains and guides." },
      { property: "og:title", content: "About Fishtrippers" },
      { property: "og:description", content: "Learn more about Fishtrippers." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="about" fallbackTitle="About Fishtrippers" fallbackDescription="The marketplace built for anglers, captains, and guides." />
  ),
});
