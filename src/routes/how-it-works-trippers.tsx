import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/how-it-works-trippers")({
  head: () => ({
    meta: [
      { title: "How it Works for Trippers — Fishtrippers" },
      { name: "description", content: "How to find, book, and enjoy your next fishing trip on Fishtrippers." },
      { property: "og:title", content: "How it Works for Trippers" },
      { property: "og:description", content: "Find, book, and fish — here's how Fishtrippers works for anglers." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="how-it-works-trippers" fallbackTitle="How it Works for Trippers" />
  ),
});
