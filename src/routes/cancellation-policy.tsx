import { createFileRoute } from "@tanstack/react-router";
import { SitePageRenderer } from "@/components/info/SitePageRenderer";

export const Route = createFileRoute("/cancellation-policy")({
  head: () => ({
    meta: [
      { title: "Pricing & Cancellation Policy — Fishtrippers" },
      { name: "description", content: "Fishtrippers pricing, fees, and cancellation policy details." },
      { property: "og:title", content: "Pricing & Cancellation Policy" },
      { property: "og:description", content: "Fishtrippers pricing, fees, and cancellation policy details." },
    ],
  }),
  component: () => (
    <SitePageRenderer slug="cancellation-policy" fallbackTitle="Pricing & Cancellation Policy" />
  ),
});
