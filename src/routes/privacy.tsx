import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Fishtrippers" },
      { name: "description", content: "How Fishtrippers collects, uses, and protects your information." },
      { property: "og:title", content: "Privacy Policy — Fishtrippers" },
      { property: "og:description", content: "How Fishtrippers collects, uses, and protects your information." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="privacy" fallbackTitle="Privacy Policy" />
  ),
});
