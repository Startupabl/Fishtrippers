import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
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
import { cn } from "@/lib/utils";
import { submitSupportTicket } from "@/lib/support-tickets.functions";

const TOPIC_OPTIONS = [
  { value: "general_question", label: "General Question" },
  { value: "billing_stripe", label: "Billing & Stripe Connect" },
  { value: "virtual_classroom_tech", label: "Virtual Classroom Tech Issue" },
  { value: "booking_no_show", label: "Report a Booking/No-Show Issue" },
] as const;

const USER_TYPE_OPTIONS = [
  { value: "learner", label: "Learner" },
  { value: "aide", label: "Aide" },
  { value: "visitor", label: "Visitor" },
] as const;

const schema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().email("Enter a valid email").max(255),
  user_type: z.enum(["learner", "aide", "visitor"]),
  topic: z.enum(["general_question", "billing_stripe", "virtual_classroom_tech", "booking_no_show"]),
  booking_id: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, "Please add at least 10 characters").max(5000),
});

type FormState = {
  full_name: string;
  email: string;
  user_type: "learner" | "aide" | "visitor" | "";
  topic: "general_question" | "billing_stripe" | "virtual_classroom_tech" | "booking_no_show" | "";
  booking_id: string;
  message: string;
};

const EMPTY: FormState = {
  full_name: "",
  email: "",
  user_type: "",
  topic: "",
  booking_id: "",
  message: "",
};

export function ContactSupportForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const submit = useServerFn(submitSupportTicket);

  const mutation = useMutation({
    mutationFn: (payload: z.infer<typeof schema>) =>
      submit({
        data: {
          ...payload,
          booking_id: payload.booking_id?.length ? payload.booking_id : null,
        },
      }),
    onSuccess: () => {
      setForm(EMPTY);
      setErrors({});
      setSubmitted(true);
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't submit your ticket"),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    mutation.mutate(parsed.data);
  }

  const isBookingTopic = form.topic === "booking_no_show";

  if (submitted) {
    return (
      <section
        aria-live="polite"
        className="mt-10 animate-in fade-in zoom-in-95 rounded-2xl border border-[#0A2540]/30 bg-[#0A2540]/5 p-8 text-center duration-500"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#0A2540]/15">
          <CheckCircle2 className="size-7 text-[#0A2540]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Thank you!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your support ticket has been received. Our team will review your request and reach out within 24 hours.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          Submit another request
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Contact our support team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill out the form below and we'll get back to you within 24 hours.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full Name" htmlFor="cs-name" error={errors.full_name} required>
            <Input
              id="cs-name"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Email Address" htmlFor="cs-email" error={errors.email} required>
            <Input
              id="cs-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="I am a..." htmlFor="cs-user-type" error={errors.user_type} required>
            <Select
              value={form.user_type || undefined}
              onValueChange={(v) => update("user_type", v as FormState["user_type"])}
            >
              <SelectTrigger id="cs-user-type">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                {USER_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Topic" htmlFor="cs-topic" error={errors.topic} required>
            <Select
              value={form.topic || undefined}
              onValueChange={(v) => update("topic", v as FormState["topic"])}
            >
              <SelectTrigger id="cs-topic">
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
          </Field>
        </div>

        <Field
          label="Booking ID / Course Name"
          htmlFor="cs-booking"
          hint="Only required if reporting an issue with a specific lesson"
          error={errors.booking_id}
        >
          <div className="relative">
            <Input
              id="cs-booking"
              value={form.booking_id}
              onChange={(e) => update("booking_id", e.target.value)}
              className={cn(
                "transition-shadow",
                isBookingTopic && "ring-2 ring-[#E8B547]/70 border-[#E8B547]/70 focus-visible:ring-[#E8B547]",
              )}
              placeholder="e.g. LMN-1042 or 'Intro to Watercolor'"
            />
            {isBookingTopic && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B8860B]">
                <AlertCircle className="size-4" />
              </span>
            )}
          </div>
          {isBookingTopic && (
            <p className="mt-1 text-xs font-medium text-[#B8860B]">
              Please include the Booking ID or Course Name so we can investigate.
            </p>
          )}
        </Field>

        <Field label="Message" htmlFor="cs-message" error={errors.message} required>
          <Textarea
            id="cs-message"
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            rows={6}
            placeholder="Tell us how we can help…"
            required
          />
        </Field>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={mutation.isPending}
            style={{ backgroundColor: "#0A2540" }}
            className="text-white hover:opacity-95"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" /> Sending…
              </>
            ) : (
              "Submit support request"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
