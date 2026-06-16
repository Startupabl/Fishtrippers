import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — FishTrippers" },
      {
        name: "description",
        content: "Reset your FishTrippers password by email.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmittedEmail(email);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center px-4 py-10">
      <Logo size="xl" showTagline align="center" />

      <div className="mt-8 w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1
          className="text-3xl text-foreground"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email address associated with your account and we'll send
          you a link to reset your password.
        </p>

        {submittedEmail ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info/10 p-4 text-sm text-foreground"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-info" />
            <p>
              Check your email! If an account exists for{" "}
              <strong>{submittedEmail}</strong>, you will receive a reset link
              shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
                placeholder="you@example.com"
                required
              />
            </label>
            <Button type="submit" variant="info" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-info hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}
