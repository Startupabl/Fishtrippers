import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

export const Route = createFileRoute("/login")({
  validateSearch: zodValidator(
    z.object({ redirect: fallback(z.string(), "").default("") }),
  ),
  head: () => ({
    meta: [
      { title: "Log in — Lemonaidely" },
      { name: "description", content: "Log in to your Lemonaidely account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const safeRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${safeRedirect}`,
    });
    if (result.error) toast.error(result.error.message);
    // On success the ProfileCompletionRedirector will route incomplete
    // accounts to /settings/profile; returning users stay on safeRedirect.
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Check profile status before routing.
    let isComplete = true;
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_profile_complete, user_status")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.user_status === "archived") {
        await supabase.auth.signOut();
        toast.error(
          "This account has been deactivated. Please contact support if you need assistance or require access to your historical records.",
        );
        return;
      }
      isComplete = Boolean(profile?.is_profile_complete);
    }
    navigate({ to: isComplete ? safeRedirect : "/settings/profile" });
  }

  return (
    <AuthLayout>
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <AuthTabs />

        <div className="mt-6">
          <SocialAuthButtons onAuthenticate={handleGoogle} />
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
              placeholder="••••••••"
            />
          </label>

          <div className="-mt-2 flex justify-end">
            <Link to="/forgot-password" className="text-sm text-info hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="info" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
