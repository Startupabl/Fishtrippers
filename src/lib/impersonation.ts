import { supabase } from "@/integrations/supabase/client";

const KEY = "lovable.admin_session_v1";

type Saved = {
  access_token: string;
  refresh_token: string;
  admin_user_id: string;
  target_user_id: string;
  target_email: string | null;
};

export async function startImpersonation(args: {
  tokenHash: string;
  targetUserId: string;
  targetEmail: string | null;
}): Promise<void> {
  const { data: sessData } = await supabase.auth.getSession();
  const session = sessData.session;
  if (!session) throw new Error("No active admin session to save");

  const payload: Saved = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    admin_user_id: session.user.id,
    target_user_id: args.targetUserId,
    target_email: args.targetEmail,
  };
  sessionStorage.setItem(KEY, JSON.stringify(payload));

  const { error } = await supabase.auth.verifyOtp({
    token_hash: args.tokenHash,
    type: "magiclink",
  });
  if (error) {
    sessionStorage.removeItem(KEY);
    throw error;
  }
}

export async function stopImpersonation(): Promise<string | null> {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  let saved: Saved;
  try {
    saved = JSON.parse(raw) as Saved;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
  const { error } = await supabase.auth.setSession({
    access_token: saved.access_token,
    refresh_token: saved.refresh_token,
  });
  sessionStorage.removeItem(KEY);
  if (error) throw error;
  return saved.admin_user_id;
}

export function getImpersonationState(): {
  admin_user_id: string;
  target_user_id: string;
  target_email: string | null;
} | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Saved;
    return {
      admin_user_id: s.admin_user_id,
      target_user_id: s.target_user_id,
      target_email: s.target_email,
    };
  } catch {
    return null;
  }
}
