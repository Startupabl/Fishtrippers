import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Anchor, Facebook, Instagram, Mail, Music2, Youtube, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Fishtrippers — Trip & Hosting Support" },
      {
        name: "description",
        content:
          "Get in touch with the Fishtrippers team. Help with bookings, hosting your charter or guide service, press inquiries, and more.",
      },
      { property: "og:title", content: "Contact Fishtrippers" },
      {
        property: "og:description",
        content:
          "Questions about a trip, your booking, or hosting on Fishtrippers? We're here to help.",
      },
    ],
  }),
  component: ContactPage,
});

const TOPIC_OPTIONS = [
  { value: "specific_trip", label: "A specific trip" },
  { value: "my_listing", label: "My listing" },
  { value: "general_questions", label: "General questions" },
  { value: "technical_issues", label: "Technical issues" },
  { value: "other", label: "Other" },
] as const;

type TopicValue = (typeof TOPIC_OPTIONS)[number]["value"];

const ClientSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum(["specific_trip", "my_listing", "general_questions", "technical_issues", "other"]),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

const SOCIALS = [
  { href: "https://www.facebook.com/fishtrippers", label: "Facebook", icon: Facebook },
  { href: "https://www.instagram.com/fishtrippers", label: "Instagram", icon: Instagram },
  { href: "https://www.youtube.com/@fishtrippers", label: "YouTube", icon: Youtube },
  { href: "https://www.tiktok.com/@fishtrippers", label: "TikTok", icon: Music2 },
];

function ContactPage() {
  const submit = useServerFn(submitSupportTicket);
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "" as TopicValue | "",
    message: "",
    website: "", // honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: z.infer<typeof ClientSchema>) => {
      // Honeypot tripped — silently succeed
      if (payload.website && payload.website.length > 0) {
        return { ok: true };
      }
      return submit({
        data: {
          full_name: payload.name,
          email: payload.email,
          user_type: "visitor",
          topic: payload.topic,
          booking_id: null,
          message: payload.message,
        },
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent — we'll be in touch.");
      setForm({ name: "", email: "", topic: "", message: "", website: "" });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Something went wrong");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = ClientSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A1A2F] via-[#0F2740] to-[#0A1A2F] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_top,white,transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 md:px-6 py-20 md:py-28 text-center">
          <div className="mx-auto mb-6 inline-flex size-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Anchor className="size-7" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Get in touch</h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-slate-200">
            Questions about a trip, your booking, or hosting on Fishtrippers? We're here to help —
            usually within one business day.
          </p>
        </div>
      </section>

      {/* Form + info */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Form card */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h2 className="text-2xl font-semibold">Thanks — message received</h2>
                  <p className="mt-2 text-muted-foreground">
                    We'll reply within 1 business day at the email you provided.
                  </p>
                  <Button className="mt-6" variant="outline" onClick={() => setSubmitted(false)}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <h2 className="text-2xl font-semibold">Send us a message</h2>

                  {/* Honeypot */}
                  <input
                    type="text"
                    name="website"
                    autoComplete="off"
                    tabIndex={-1}
                    aria-hidden="true"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        maxLength={100}
                        required
                        className="mt-1"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        maxLength={255}
                        required
                        className="mt-1"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="topic">Topic</Label>
                    <Select
                      value={form.topic || undefined}
                      onValueChange={(v) =>
                        setForm({ ...form, topic: v as TopicValue })
                      }
                    >
                      <SelectTrigger id="topic" className="mt-1">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPIC_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.topic && (
                      <p className="mt-1 text-sm text-destructive">{errors.topic}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      maxLength={5000}
                      required
                      className="mt-1"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {errors.message && (
                          <span className="text-destructive">{errors.message}</span>
                        )}
                      </span>
                      <span>{form.message.length}/5000</span>
                    </div>
                  </div>

                  <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full sm:w-auto">
                    {mutation.isPending ? "Sending…" : "Send message"}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Info card */}
          <aside className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-[#0A1A2F] to-[#0F2740] p-6 md:p-8 text-white shadow-sm h-full">
              <h2 className="text-xl font-semibold">Other ways to reach us</h2>
              <p className="mt-2 text-sm text-slate-300">
                Prefer email or social? Pick whatever's easiest.
              </p>

              <div className="mt-6 space-y-4">
                <a
                  href="mailto:hello@fishtrippers.com"
                  className="flex items-start gap-3 group"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 group-hover:bg-white/20 transition">
                    <Mail className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm text-slate-300">Email</span>
                    <span className="block font-medium group-hover:underline">
                      hello@fishtrippers.com
                    </span>
                  </span>
                </a>

                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                    <Anchor className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm text-slate-300">Response time</span>
                    <span className="block font-medium">Within 1 business day</span>
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Follow us
                </p>
                <ul className="mt-3 flex gap-3">
                  {SOCIALS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <li key={s.href}>
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label}
                          className="inline-flex size-10 items-center justify-center rounded-lg border border-white/20 text-white transition-colors hover:bg-white hover:text-[#0A1A2F]"
                        >
                          <Icon className="size-5" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
