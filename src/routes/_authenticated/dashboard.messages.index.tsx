import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/messages/")({
  component: MessagesEmptyState,
});

function MessagesEmptyState() {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-10">
      <div className="max-w-sm text-center">
        <svg
          viewBox="0 0 120 120"
          className="mx-auto mb-6 size-28 drop-shadow-sm"
          aria-hidden
        >
          <ellipse
            cx="60"
            cy="68"
            rx="42"
            ry="34"
            transform="rotate(-18 60 68)"
            fill="#E8B547"
            stroke="#0A2540"
            strokeWidth="3"
          />
          <path
            d="M86 36c6-7 16-9 21-5 4 3 1 12-5 18-5 5-12 7-17 5"
            fill="#0A2540"
            stroke="#0A2540"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M44 60c4-3 10-3 16 1"
            stroke="#0A2540"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </svg>
        <h2 className="text-lg font-semibold text-foreground">
          No conversation selected
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a conversation to view your messages.
        </p>
      </div>
    </div>
  );
}
