// Attaches the current Supabase access token as an Authorization Bearer header
// to all client-initiated server function calls (`/_serverFn/*`), so server
// functions guarded by `requireSupabaseAuth` work transparently.

import { supabase } from "@/integrations/supabase/client";

let installed = false;

export function installServerFnAuthFetch() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      // Only target same-origin server function endpoints.
      const path = url.startsWith("http")
        ? new URL(url).pathname
        : url;

      if (path.startsWith("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) {
            headers.set("authorization", `Bearer ${token}`);
            init = { ...(init ?? {}), headers };
          }
        }
      }
    } catch (err) {
      // Never block the request if anything goes wrong attaching the token.
      console.warn("[server-fn-auth] failed to attach token", err);
    }

    return originalFetch(input, init);
  };
}
