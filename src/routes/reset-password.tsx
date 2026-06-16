import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — FishTrippers" },
      { name: "description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 1500);
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center px-4 py-10">
      <Logo size="xl" showTagline align="center" />
      <div className="mt-8 w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1
          className="text-3xl text-foreground"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Set a new password
        </h1>
        {done ? (
          <div className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info/10 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-info" />
            <p>Password updated. Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
                placeholder="At least 8 characters"
              />
            </label>
            <Button type="submit" variant="info" size="lg" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-info hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}
