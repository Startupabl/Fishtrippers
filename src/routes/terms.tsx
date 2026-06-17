import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Fishtrippers" },
      { name: "description", content: "The terms governing use of the Fishtrippers platform." },
      { property: "og:title", content: "Terms of Service — Fishtrippers" },
      { property: "og:description", content: "The terms governing use of the Fishtrippers platform." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="terms" fallbackTitle="Terms of Service" />
  ),
});
