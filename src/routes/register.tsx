import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { verifyTurnstile } from "@/lib/turnstile.functions";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  validateSearch: zodValidator(
    z.object({ redirect: fallback(z.string(), "").default("") }),
  ),
  head: () => ({
    meta: [
      { title: "Create your account — FishTrippers" },
      {
        name: "description",
        content: "Sign up for FishTrippers and find your perfect AI Aide.",
      },
    ],
  }),
  component: RegisterPage,
});

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const VERIFY_ERROR = "Unable to verify request. Please try again.";

type TurnstileAPI = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      size?: "invisible" | "normal" | "compact";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

function RegisterPage() {
  const { redirect: redirectTo } = Route.useSearch();
  void redirectTo;
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenResolverRef = useRef<((token: string | null) => void) | null>(null);

  // Load Turnstile script + render invisible widget once.
  useEffect(() => {
    if (!SITE_KEY) return;
    const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

    function renderWidget() {
      if (!window.turnstile || !widgetContainerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
        sitekey: SITE_KEY!,
        size: "invisible",
        callback: (token: string) => {
          tokenResolverRef.current?.(token);
          tokenResolverRef.current = null;
        },
        "error-callback": () => {
          tokenResolverRef.current?.(null);
          tokenResolverRef.current = null;
        },
        "expired-callback": () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else if (!document.querySelector(`script[src="${SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.defer = true;
      s.onload = renderWidget;
      document.head.appendChild(s);
    } else {
      const i = setInterval(() => {
        if (window.turnstile) {
          clearInterval(i);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(i);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  async function getTurnstileToken(): Promise<string | null> {
    if (!SITE_KEY) return null; // misconfigured — fail closed
    if (!window.turnstile || !widgetIdRef.current) return null;
    return new Promise<string | null>((resolve) => {
      tokenResolverRef.current = resolve;
      try {
        window.turnstile!.reset(widgetIdRef.current!);
        window.turnstile!.execute(widgetIdRef.current!);
      } catch {
        resolve(null);
      }
      // Safety timeout
      setTimeout(() => {
        if (tokenResolverRef.current) {
          tokenResolverRef.current = null;
          resolve(null);
        }
      }, 15000);
    });
  }

  async function verifyHuman(): Promise<boolean> {
    // No site key configured → bot-check is disabled; allow signup through.
    if (!SITE_KEY) return true;
    const token = await getTurnstileToken();
    if (!token) return false;
    try {
      const res = await verifyTurnstile({ data: { token } });
      return Boolean(res?.success);
    } catch {
      return false;
    }
  }

  async function handleGoogle() {
    setVerifyError(null);
    // Google OAuth provides its own bot/abuse protection — skip the
    // invisible Turnstile gate, which can silently fail on mobile when
    // an interactive challenge is required but the container is hidden.
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) toast.error(result.error.message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setLoading(true);

    const ok = await verifyHuman();
    if (!ok) {
      setLoading(false);
      setVerifyError(VERIFY_ERROR);
      toast.error(VERIFY_ERROR);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding/choice`,
        data: { first_name: firstName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSentTo(email);
  }

  return (
    <AuthLayout>
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <AuthTabs />

        {sentTo ? (
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-md border border-info/30 bg-info/10 p-4 text-sm text-foreground"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-info" />
            <p>
              Check your inbox at <strong>{sentTo}</strong> to verify your email
              and finish setting up your account.
            </p>
          </div>
        ) : (
          <>
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
                <span className="text-sm font-medium text-foreground">First name</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
                  placeholder="Alex"
                />
              </label>
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
                  minLength={8}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info"
                  placeholder="At least 8 characters"
                />
              </label>

              <p className="text-center text-xs text-muted-foreground">
                By clicking Create Account, you agree to our{" "}
                <Link
                  to="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-info"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-info"
                >
                  Privacy Policy
                </Link>
                .
              </p>

              <Button type="submit" variant="info" size="lg" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>

              {verifyError ? (
                <p role="alert" className="text-sm text-destructive">
                  {verifyError}
                </p>
              ) : null}

              {/* Invisible Cloudflare Turnstile widget */}
              <div ref={widgetContainerRef} aria-hidden="true" className="hidden" />
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
