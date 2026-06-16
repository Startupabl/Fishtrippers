import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Send, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OfferBubble } from "@/components/chat/OfferBubble";
import { CustomOfferDialog } from "@/components/chat/CustomOfferDialog";
import { useChatStore, type ChatAuthor } from "@/stores/useChatStore";
import { useCheckoutStore } from "@/stores/useCheckoutStore";
import { useCurrencyStore } from "@/stores/useCurrencyStore";

const searchSchema = z.object({
  as: fallback(z.enum(["mentor", "learner"]), "learner").default("learner"),
  mentor: fallback(z.string(), "").default(""),
  title: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/messages/$threadId")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [{ title: "Messages — FishTrippers" }],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { threadId } = Route.useParams();
  const { as, mentor, title } = Route.useSearch();
  const navigate = useNavigate();
  const currency = useCurrencyStore((s) => s.currency);

  const ensureThread = useChatStore((s) => s.ensureThread);
  const thread = useChatStore((s) => s.threads[threadId]);
  const appendText = useChatStore((s) => s.appendText);
  const appendOffer = useChatStore((s) => s.appendOffer);
  // setOfferStatus reserved for future decline action
  const setSelection = useCheckoutStore((s) => s.setSelection);

  const [text, setText] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    ensureThread(threadId, {
      mentorName: mentor || "Your mentor",
      pathTitle: title || undefined,
    });
  }, [threadId, mentor, title, ensureThread]);

  const viewer: ChatAuthor = as;
  const viewerIsMentor = viewer === "mentor";
  const meta = thread?.meta;

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    appendText(threadId, viewer, text.trim());
    setText("");
  }

  function handleAcceptOffer(messageId: string, offer: {
    description: string;
    sessions: number;
    priceMinor: number;
    currency: string;
  }) {
    setSelection({
      pathId: `offer-${messageId}`,
      mentorId: threadId,
      mentorName: meta?.mentorName ?? "Your mentor",
      mentorAvatarUrl: meta?.mentorAvatarUrl ?? "",
      pathTitle: `Custom Offer · ${offer.sessions} ${offer.sessions === 1 ? "session" : "sessions"}`,
      highlights: [offer.description],
      priceMinor: offer.priceMinor,
      currency: offer.currency,
      sessionDateIso: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      sessionTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      customOffer: {
        threadId,
        messageId,
        description: offer.description,
        sessions: offer.sessions,
      },
    });
    navigate({ to: "/checkout" });
  }

  return (
    <div className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden bg-paper">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-4">
          <Logo size="md" />
          <div className="flex min-w-0 items-center gap-1 text-xs sm:gap-2">
            <Button
              size="sm"
              variant={viewer === "learner" ? "info" : "ghost"}
              onClick={() =>
                navigate({
                  to: "/messages/$threadId",
                  params: { threadId },
                  search: { as: "learner", mentor, title },
                })
              }
            >
              View as Learner
            </Button>
            <Button
              size="sm"
              variant={viewer === "mentor" ? "info" : "ghost"}
              onClick={() =>
                navigate({
                  to: "/messages/$threadId",
                  params: { threadId },
                  search: { as: "mentor", mentor, title },
                })
              }
            >
              View as Aide
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-w-0 w-full max-w-3xl flex-1 flex-col overflow-x-hidden px-4 py-6">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-foreground">
            {meta?.mentorName ?? "Conversation"}
          </h1>
          {meta?.pathTitle && (
            <p className="text-sm text-muted-foreground">{meta.pathTitle}</p>
          )}
        </div>

        <div className="min-w-0 max-w-full flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-card p-4">
          {(thread?.messages.length ?? 0) === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet. Say hello 👋
            </p>
          )}
          {thread?.messages.map((m) => {
            const mine = m.author === viewer;
            return (
              <div
                key={m.id}
                className={`flex min-w-0 max-w-full ${mine ? "justify-end" : "justify-start"}`}
              >
                {m.kind === "text" ? (
                  <div
                    className={`min-w-0 max-w-[85%] sm:max-w-md whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-2 text-sm ${
                      mine
                        ? "bg-info text-info-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                ) : (
                  <div className="min-w-0 w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:w-fit sm:max-w-md">
                    <OfferBubble
                      offer={m.offer}
                      status={m.status}
                      viewerIsMentor={viewerIsMentor}
                      onAccept={() => handleAcceptOffer(m.id, m.offer)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          onSubmit={handleSend}
          className="mt-4 flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card p-2"
        >
          {viewerIsMentor && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Send custom offer"
              onClick={() => setOfferOpen(true)}
            >
              <Sparkles className="size-5 text-info" />
            </Button>
          )}
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>

        {viewerIsMentor && (
          <CustomOfferDialog
            open={offerOpen}
            onOpenChange={setOfferOpen}
            defaultCurrency={currency}
            onSubmit={(offer) => {
              appendOffer(threadId, "mentor", offer);
            }}
          />
        )}
      </main>
    </div>
  );
}
