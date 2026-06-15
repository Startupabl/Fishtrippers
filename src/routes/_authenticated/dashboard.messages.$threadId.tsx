import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Send, CreditCard, Loader2, Sparkles, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { convertMinor } from "@/lib/currency";
import { formatCurrency } from "@/lib/format-currency";
import { CustomOfferComposer } from "@/components/chat/CustomOfferComposer";
import { CustomOfferCard } from "@/components/chat/CustomOfferCard";
import { FileMessageBubble } from "@/components/chat/FileMessageBubble";
import {
  getThread,
  listMessages,
  sendMessage,
  sendFileMessage,
  markThreadRead,
  type ThreadDetail,
  type MessageRow,
} from "@/lib/messages.functions";
import {
  ACCEPT_ATTR,
  uploadMessageAttachment,
  validateAttachment,
} from "@/lib/message-attachment-upload";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { cn } from "@/lib/utils";
import { AvatarLargePopover } from "@/components/profile/AvatarLargePopover";

export const Route = createFileRoute("/_authenticated/dashboard/messages/$threadId")({
  head: () => ({ meta: [{ title: "Conversation — Lemonaidely" }] }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const display = useCurrencyStore((s) => s.currency);

  const fetchThread = useServerFn(getThread);
  const fetchMessages = useServerFn(listMessages);
  const send = useServerFn(sendMessage);
  const sendFile = useServerFn(sendFileMessage);
  const markRead = useServerFn(markThreadRead);
  const startCheckout = useServerFn(createCheckoutSession);

  const [meta, setMeta] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchThread({ data: { thread_id: threadId } }),
      fetchMessages({ data: { thread_id: threadId } }),
    ])
      .then(([m, msgs]) => {
        if (cancelled) return;
        setMeta(m);
        setMessages(msgs);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not load conversation.");
      });
    markRead({ data: { thread_id: threadId } })
      .then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("messages:unread-changed"));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [threadId, user, fetchThread, fetchMessages, markRead, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // Poll for new messages every 15s
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      fetchMessages({ data: { thread_id: threadId } })
        .then((msgs) => {
          setMessages((prev) => (msgs.length !== prev.length ? msgs : prev));
        })
        .catch(() => {});
      markRead({ data: { thread_id: threadId } })
        .then(() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("messages:unread-changed"));
          }
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [threadId, user, fetchMessages, markRead]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const row = await send({ data: { thread_id: threadId, body: text.trim(), is_urgent: isUrgent } });
      setMessages((m) => [...m, row]);
      setText("");
      setIsUrgent(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading || sending) return;
    const err = validateAttachment(file);
    if (err) {
      toast.error(err);
      return;
    }
    setUploading(true);
    try {
      const up = await uploadMessageAttachment(file, threadId);
      const row = await sendFile({
        data: {
          thread_id: threadId,
          url: up.url,
          name: up.name,
          mime: up.mime,
          size_bytes: up.size,
        },
      });
      setMessages((m) => [...m, row]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCheckout(journeyId: string) {
    try {
      const { url } = await startCheckout({ data: { journey_id: journeyId } });
      if (!url) throw new Error("Stripe did not return a checkout URL.");
      try {
        window.top!.location.href = url;
      } catch {
        window.location.href = url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout.");
    }
  }

  if (!meta) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
        Loading conversation…
      </div>
    );
  }

  const fmt = (m: number, c: string) =>
    formatCurrency(convertMinor(m, c as CurrencyCode, display), display);

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
      {/* Header */}
      <header className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden border-b border-border bg-paper px-4 py-3 md:px-6">
        <Button asChild size="icon" variant="ghost" className="md:hidden">
          <Link to="/dashboard/messages">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <AvatarLargePopover
          displayName={meta.counterpart_name}
          avatarUrl={meta.counterpart_avatar_url ?? null}
          motto={meta.counterpart_motto ?? null}
        >
          <img
            src={
              meta.counterpart_avatar_url ??
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(meta.counterpart_name)}`
            }
            alt={meta.counterpart_name}
            className="size-11 rounded-full object-cover"
          />
        </AvatarLargePopover>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-base font-bold text-foreground"
            style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
          >
            {meta.counterpart_name}
          </p>
          {meta.journey_title && (
            <p className="truncate text-xs text-muted-foreground">
              {meta.journey_title}
            </p>
          )}
        </div>
        {meta.i_am === "mentor" && (
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={() => setOfferOpen(true)}
            className="min-w-0 shrink-0 gap-1 font-semibold"
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="hidden sm:inline">Send Custom Offer</span>
            <span className="sm:hidden">Offer</span>
          </Button>
        )}
      </header>

      {meta.i_am === "mentor" && (
        <CustomOfferComposer
          open={offerOpen}
          onOpenChange={setOfferOpen}
          threadId={threadId}
          defaultCurrency={meta.journey_currency ?? "USD"}
          onSent={() => {
            fetchMessages({ data: { thread_id: threadId } })
              .then((msgs) => setMessages(msgs))
              .catch(() => {});
          }}
        />
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-w-0 max-w-full flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-5 md:px-6"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          if (m.attachment_type === "custom_offer" && m.booking_id) {
            return (
              <div key={m.id} className={cn("flex min-w-0 max-w-full", mine ? "justify-end" : "justify-start")}>
                <div className="min-w-0 w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:w-fit sm:max-w-md">
                  <CustomOfferCard bookingId={m.booking_id} viewerId={user?.id} />
                </div>
              </div>
            );
          }
          if (m.attachment_type === "payment_link" && m.payment_link_journey_id) {
            return (
              <div key={m.id} className={cn("flex min-w-0 max-w-full", mine ? "justify-end" : "justify-start")}>
                <div className="min-w-0 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:w-fit sm:max-w-sm">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                    <CreditCard className="size-4" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">Payment Link</span>
                  </div>
                  {meta.journey_title && (
                    <p className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]">{meta.journey_title}</p>
                  )}
                  {meta.journey_price_minor != null && meta.journey_currency && (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {fmt(meta.journey_price_minor, meta.journey_currency)}
                    </p>
                  )}
                  {mine ? (
                      <p className="mt-3 min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      Payment link sent. Waiting for {meta.counterpart_name} to check out.
                    </p>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      variant="info"
                      onClick={() => handleCheckout(m.payment_link_journey_id!)}
                    >
                      Check Out
                    </Button>
                  )}
                </div>
              </div>
            );
          }
          if (m.attachment_type === "file" && m.attachment_url && m.attachment_name) {
            return (
              <div key={m.id} className={cn("flex min-w-0 max-w-full", mine ? "justify-end" : "justify-start")}>
                <div className="min-w-0 w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:w-fit sm:max-w-sm">
                  <FileMessageBubble
                    name={m.attachment_name}
                    url={m.attachment_url}
                    mime={m.attachment_mime}
                    size={m.attachment_size_bytes}
                    mine={mine}
                  />
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={cn("flex min-w-0 max-w-full", mine ? "justify-end" : "justify-start")}>
              <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1 sm:max-w-md", mine ? "items-end" : "items-start")}>
                {m.is_urgent && (
                  <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Urgent
                  </span>
                )}
                <div
                  className={cn(
                    "min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-3 leading-relaxed shadow-sm",
                    "text-[18px] font-medium",
                    mine
                      ? "text-foreground"
                      : "border border-border bg-white text-black",
                    m.is_urgent && "ring-2 ring-red-500",
                  )}
                  style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    ...(mine ? { backgroundColor: "#FFF4C2" } : {}),
                  }}
                >
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <form
        onSubmit={handleSend}
        className="sticky bottom-0 mb-[64px] min-w-0 max-w-full overflow-x-hidden border-t border-border bg-paper px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:px-6 lg:mb-0"
      >
        {uploading && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Uploading file…
          </div>
        )}
        <div className="flex min-w-0 max-w-full items-stretch gap-2 md:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleFileSelected}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach file"
            disabled={uploading || sending}
            onClick={() => fileInputRef.current?.click()}
            className="h-auto self-stretch px-3"
          >
            <Paperclip className="size-5" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            className="min-h-14 min-w-0 flex-1 resize-none rounded-xl text-base"
          />
          <Button
            type="submit"
            variant="info"
            aria-label="Send message"
            disabled={!text.trim() || sending || uploading}
            className="h-auto self-stretch px-3 text-base font-semibold lg:px-5"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin lg:mr-2" />
            ) : (
              <Send className="size-4 lg:mr-2" />
            )}
            <span className="hidden lg:inline">Send Message</span>
          </Button>
        </div>
        <label className="mt-2 flex min-w-0 max-w-full items-center gap-2 text-xs font-medium text-muted-foreground">
          <Checkbox
            checked={isUrgent}
            onCheckedChange={(v) => setIsUrgent(v === true)}
            disabled={sending || uploading}
            aria-label="Mark as urgent"
          />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            Mark as Urgent
          </span>
        </label>
      </form>

    </div>
  );
}
