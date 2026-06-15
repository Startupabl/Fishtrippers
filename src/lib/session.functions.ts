// Records the caller's IP on each session hydrate and rejects blocked IPs.
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const recordSessionIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Prefer Cloudflare's trusted edge header. Both cf-connecting-ip
    // (Cloudflare-injected, not client-settable) and true-client-ip
    // are spoof-resistant at the edge. Fall back to x-forwarded-for
    // last since that header is freely set by clients.
    let ip: string | null = null;
    const cfIp = getRequestHeader("cf-connecting-ip");
    if (cfIp) ip = cfIp.trim();
    if (!ip) {
      const trueClient = getRequestHeader("true-client-ip");
      if (trueClient) ip = trueClient.trim();
    }
    if (!ip) {
      try {
        ip = getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        ip = null;
      }
    }
    if (!ip) {
      const xff = getRequestHeader("x-forwarded-for");
      if (xff) ip = xff.split(",")[0]?.trim() ?? null;
    }
    if (!ip) return { ok: true, ip: null, blocked: false };

    const ua = getRequestHeader("user-agent") ?? null;

    const { data: blocked } = await supabaseAdmin
      .from("blocked_ips")
      .select("ip")
      .eq("ip", ip)
      .maybeSingle();

    if (blocked) {
      await supabaseAdmin
        .from("profiles")
        .update({ user_status: "blocked", last_ip: ip, last_ip_at: new Date().toISOString() })
        .eq("id", context.userId);
      throw new Error("IP_BLOCKED");
    }

    await supabaseAdmin
      .from("profiles")
      .update({ last_ip: ip, last_ip_at: new Date().toISOString() })
      .eq("id", context.userId);

    // Append to ip_history, but dedupe: skip if same IP within last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("ip_history")
      .select("id")
      .eq("user_id", context.userId)
      .eq("ip", ip)
      .gte("seen_at", hourAgo)
      .limit(1)
      .maybeSingle();
    if (!recent) {
      await supabaseAdmin
        .from("ip_history")
        .insert({ user_id: context.userId, ip, user_agent: ua });
    }

    return { ok: true, ip, blocked: false };
  });
