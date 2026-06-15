import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { displayMentorName } from "@/lib/mentor-display";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";

interface ContactMentorButtonProps {
  mentorName: string;
  topicHint?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ContactMentorButton({
  mentorName,
  topicHint,
  size = "default",
  className,
}: ContactMentorButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { guard, dialog: profileGuardDialog } = useProfileGuard();

  const placeholder = `Hi! I'd like to learn more about ${
    topicHint ?? "your Aide-ship"
  }…`;
  const valid = message.trim().length >= 10;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || sending) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    setOpen(false);
    setMessage("");
    toast.success("Message sent!", {
      description: `${displayMentorName(mentorName)} usually responds within 24 hours. Check your inbox for updates.`,
      duration: 6000,
    });
  }

  function handleOpenChange(next: boolean) {
    if (sending) return;
    setOpen(next);
    if (!next) setMessage("");
  }

  return (
    <>
      <Button
        variant="info"
        size={size}
        className={className}
        onClick={guard(() => setOpen(true))}
      >
        <Mail />
        Contact Aide
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a message to {displayMentorName(mentorName)}</DialogTitle>
          <DialogDescription>
            A friendly intro goes a long way. Most Aides reply within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={5}
            autoFocus
            disabled={sending}
            aria-label="Your message"
          />
          <p className="text-xs text-muted-foreground">
            {message.trim().length < 10
              ? `Write at least ${10 - message.trim().length} more character${
                  10 - message.trim().length === 1 ? "" : "s"
                }.`
              : "Looks good — ready to send."}
          </p>

          <DialogFooter>
            <Button
              type="submit"
              variant="info"
              disabled={!valid || sending}
              className="w-full sm:w-auto"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail />
                  Send message
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
      {profileGuardDialog}
    </>
  );
}
