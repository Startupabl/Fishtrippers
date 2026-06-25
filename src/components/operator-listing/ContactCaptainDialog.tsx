import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ensureThreadWithOperator,
  sendMessage,
} from "@/lib/messages.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorId: string;
  captainName: string;
  roleLabel?: string;
}

export function ContactCaptainDialog({
  open,
  onOpenChange,
  operatorId,
  captainName,
  roleLabel = "Captain",
}: Props) {
  const [body, setBody] = useState("");
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const ensureThread = useServerFn(ensureThreadWithOperator);
  const send = useServerFn(sendMessage);

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const { thread_id } = await ensureThread({
        data: { operator_id: operatorId },
      });
      await send({ data: { thread_id, body: text } });
      return thread_id;
    },
    onSuccess: (thread_id) => {
      toast.success("Message sent");
      setBody("");
      onOpenChange(false);
      navigate({
        to: "/dashboard/messages/$threadId",
        params: { threadId: thread_id },
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not send message.";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }
    if (!user) {
      onOpenChange(false);
      const redirect =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search + window.location.hash
          : "/";
      navigate({ to: "/auth", search: { redirect } as never });
      return;
    }
    mutation.mutate(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {captainName || `the ${roleLabel.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            Send a quick note — your {roleLabel.toLowerCase()} will reply in your inbox.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Hi ${captainName || roleLabel}, I'm interested in your trips and have a few questions…`}
            rows={6}
            maxLength={1000}
            disabled={mutation.isPending}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{body.length}/1000</span>
            <span>Min 10 characters</span>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Sending…" : "Send message"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
