import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitSupportTicket } from "@/lib/support-tickets.functions";

const TOPIC_OPTIONS = [
  { value: "specific_trip", label: "A specific trip" },
  { value: "my_listing", label: "My listing" },
  { value: "general_questions", label: "General questions" },
  { value: "technical_issues", label: "Technical issues" },
  { value: "other", label: "Other" },
] as const;

type TopicValue = (typeof TOPIC_OPTIONS)[number]["value"];

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum([
    "specific_trip",
    "my_listing",
    "general_questions",
    "technical_issues",
    "other",
  ]),
  message: z.string().trim().min(10, "Please add at least 10 characters").max(5000),
});

export function FooterContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<TopicValue | "">("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const submit = useServerFn(submitSupportTicket);

  const mutation = useMutation({
    mutationFn: (payload: z.infer<typeof schema>) =>
      submit({
        data: {
          full_name: payload.full_name,
          email: payload.email,
          user_type: "visitor",
          topic: payload.topic,
          booking_id: null,
          message: payload.message,
        },
      }),
    onSuccess: () => {
      setDone(true);
      setName("");
      setEmail("");
      setTopic("");
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't send your message"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      full_name: name,
      email,
      topic: topic || undefined,
      message,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[#E8B547]/20">
          <CheckCircle2 className="size-6 text-[#E8B547]" />
        </div>
        <h3 className="text-base font-semibold">Message received</h3>
        <p className="mt-1 text-sm text-slate-300">
          Thanks — our team will reply within 24 hours.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-white/20 bg-transparent text-white hover:bg-white hover:text-[#0A2540]"
          onClick={() => setDone(false)}
        >
          Send another
        </Button>
      </div>
    );
  }

  const inputCls =
    "h-10 border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#E8B547] focus-visible:ring-[#E8B547]/40";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <Label htmlFor="ft-topic" className="text-xs font-medium uppercase tracking-wider text-slate-300">
          What is this about?
        </Label>
        <Select value={topic || undefined} onValueChange={(v) => setTopic(v as TopicValue)}>
          <SelectTrigger
            id="ft-topic"
            className="mt-1.5 h-10 border-white/15 bg-white/5 text-white data-[placeholder]:text-slate-500 focus:border-[#E8B547] focus:ring-[#E8B547]/40"
          >
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent>
            {TOPIC_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.topic && <p className="mt-1 text-xs text-amber-300">{errors.topic}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ft-name" className="sr-only">Name</Label>
          <Input
            id="ft-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            autoComplete="name"
          />
          {errors.full_name && <p className="mt-1 text-xs text-amber-300">{errors.full_name}</p>}
        </div>
        <div>
          <Label htmlFor="ft-email" className="sr-only">Email</Label>
          <Input
            id="ft-email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-amber-300">{errors.email}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="ft-message" className="sr-only">Message</Label>
        <Textarea
          id="ft-message"
          placeholder="How can we help?"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#E8B547] focus-visible:ring-[#E8B547]/40"
        />
        {errors.message && <p className="mt-1 text-xs text-amber-300">{errors.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-[#E8B547] text-[#0A2540] hover:bg-[#d6a338]"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
