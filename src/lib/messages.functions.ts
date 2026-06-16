import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ThreadSummary {
  id: string;
  journey_id: string | null;
  journey_title: string | null;
  journey_cover_url: string | null;
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar_url: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_is_urgent: boolean;
  unread_count: number;
  is_archived: boolean;
  i_am: "learner" | "mentor";
}

export interface ThreadDetail {
  id: string;
  journey_id: string | null;
  journey_title: string | null;
  journey_price_minor: number | null;
  journey_currency: string | null;
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar_url: string | null;
  counterpart_motto: string | null;
  i_am: "learner" | "mentor";
  aide_has_replied: boolean;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  attachment_type: string;
  payment_link_journey_id: string | null;
  booking_id: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size_bytes: number | null;
  read_status: boolean;
  is_urgent: boolean;
  created_at: string;
}

function counterpartName(p: { first_name: string | null; last_name: string | null; display_name?: string | null; email: string | null } | null): string {
  if (!p) return "User";
  if (p.display_name && p.display_name.trim()) return p.display_name.trim();
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || (p.email?.split("@")[0] ?? "User");
}

export const listMyThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ filter: z.enum(["active", "archived"]).default("active") }).default({ filter: "active" }).parse(input ?? {})
  )
  .handler(async ({ data, context }): Promise<ThreadSummary[]> => {
    const { supabase, userId } = context;

    const { data: threads, error } = await supabase
      .from("message_threads")
      .select("id, learner_id, mentor_id, journey_id, last_message_at, learner_archived_at, mentor_archived_at")
      .or(`learner_id.eq.${userId},mentor_id.eq.${userId}`)
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!threads?.length) return [];

    const filtered = threads.filter((t) => {
      const isLearner = t.learner_id === userId;
      const archivedAt = isLearner ? t.learner_archived_at : t.mentor_archived_at;
      const isArchived = !!archivedAt;
      return data.filter === "archived" ? isArchived : !isArchived;
    });
    if (!filtered.length) return [];

    const journeyIds = Array.from(new Set(filtered.map((t) => t.journey_id).filter(Boolean))) as string[];
    const counterpartIds = Array.from(
      new Set(filtered.map((t) => (t.learner_id === userId ? t.mentor_id : t.learner_id)))
    );

    const [journeysRes, profilesRes, lastMsgsRes, unreadRes] = await Promise.all([
      journeyIds.length
        ? supabase
            .from("journeys")
            .select("id, title, cover_image_url")
            .in("id", journeyIds)
        : Promise.resolve({ data: [], error: null } as const),
      counterpartIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, display_name, email, avatar_url")
            .in("id", counterpartIds)
        : Promise.resolve({ data: [], error: null } as const),
      supabase
        .from("messages")
        .select("thread_id, body, created_at, attachment_type, attachment_name, is_urgent")
        .in("thread_id", filtered.map((t) => t.id))
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("thread_id, sender_id, read_status")
        .in("thread_id", filtered.map((t) => t.id))
        .eq("read_status", false),
    ]);

    const journeysById = new Map(
      (journeysRes.data ?? []).map((j) => [j.id, j])
    );
    const profilesById = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p])
    );

    const lastByThread = new Map<string, { body: string | null; attachment_type: string; attachment_name: string | null; is_urgent: boolean }>();
    for (const m of lastMsgsRes.data ?? []) {
      if (!lastByThread.has(m.thread_id)) {
        lastByThread.set(m.thread_id, {
          body: m.body,
          attachment_type: m.attachment_type,
          attachment_name: (m as { attachment_name?: string | null }).attachment_name ?? null,
          is_urgent: (m as { is_urgent?: boolean | null }).is_urgent ?? false,
        });
      }
    }

    const unreadByThread = new Map<string, number>();
    for (const m of unreadRes.data ?? []) {
      if (m.sender_id === userId) continue;
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1);
    }

    return filtered.map((t) => {
      const isLearner = t.learner_id === userId;
      const counterpartId = isLearner ? t.mentor_id : t.learner_id;
      const profile = profilesById.get(counterpartId) ?? null;
      const journey = t.journey_id ? journeysById.get(t.journey_id) : null;
      const last = lastByThread.get(t.id);
      let preview = last?.body ?? null;
      if (last?.attachment_type === "payment_link") preview = "💳 Payment link sent";
      else if (last?.attachment_type === "file") preview = `📎 ${last.attachment_name ?? "Attachment"}`;
      const archivedAt = isLearner ? t.learner_archived_at : t.mentor_archived_at;
      return {
        id: t.id,
        journey_id: t.journey_id,
        journey_title: journey?.title ?? null,
        journey_cover_url: journey?.cover_image_url ?? null,
        counterpart_id: counterpartId,
        counterpart_name: counterpartName(profile),
        counterpart_avatar_url: profile?.avatar_url ?? null,
        last_message_at: t.last_message_at,
        last_message_preview: preview,
        last_message_is_urgent: last?.is_urgent ?? false,
        unread_count: unreadByThread.get(t.id) ?? 0,
        is_archived: !!archivedAt,
        i_am: isLearner ? "learner" : "mentor",
      };
    });
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ thread_id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }): Promise<ThreadDetail> => {
    const { supabase, userId } = context;
    const { data: thread, error } = await supabase
      .from("message_threads")
      .select("id, learner_id, mentor_id, journey_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (error || !thread) throw new Error("Conversation not found.");

    const counterpartId = thread.learner_id === userId ? thread.mentor_id : thread.learner_id;
    const iAm: "learner" | "mentor" = thread.learner_id === userId ? "learner" : "mentor";

    const [{ data: profile }, journeyRes, replyRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, display_name, email, avatar_url, motto")
        .eq("id", counterpartId)
        .maybeSingle(),
      thread.journey_id
        ? supabase
            .from("journeys")
            .select("id, title, base_price_minor, currency")
            .eq("id", thread.journey_id)
            .maybeSingle()
        : Promise.resolve({ data: null } as const),
      supabase
        .from("messages")
        .select("id")
        .eq("thread_id", thread.id)
        .eq("sender_id", thread.mentor_id)
        .limit(1),
    ]);

    return {
      id: thread.id,
      journey_id: thread.journey_id,
      journey_title: journeyRes.data?.title ?? null,
      journey_price_minor: journeyRes.data?.base_price_minor ?? null,
      journey_currency: journeyRes.data?.currency ?? null,
      counterpart_id: counterpartId,
      counterpart_name: counterpartName(profile ?? null),
      counterpart_avatar_url: profile?.avatar_url ?? null,
      counterpart_motto: (profile as { motto?: string | null } | null)?.motto ?? null,
      i_am: iAm,
      aide_has_replied: (replyRes.data?.length ?? 0) > 0,
    };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      thread_id: z.string().uuid(),
      before: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).parse(input)
  )
  .handler(async ({ data, context }): Promise<MessageRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("messages")
      .select("id, thread_id, sender_id, body, attachment_type, payment_link_journey_id, booking_id, attachment_url, attachment_name, attachment_mime, attachment_size_bytes, read_status, is_urgent, created_at")
      .eq("thread_id", data.thread_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).reverse() as MessageRow[];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      thread_id: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
      is_urgent: z.boolean().optional().default(false),
    }).parse(input)
  )
  .handler(async ({ data, context }): Promise<MessageRow> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        thread_id: data.thread_id,
        sender_id: userId,
        body: data.body,
        attachment_type: "none",
        is_urgent: data.is_urgent,
      })
      .select("id, thread_id, sender_id, body, attachment_type, payment_link_journey_id, booking_id, attachment_url, attachment_name, attachment_mime, attachment_size_bytes, read_status, is_urgent, created_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not send message.");

    if (data.is_urgent) {
      try {
        const { data: thread } = await supabaseAdmin
          .from("message_threads")
          .select("id, learner_id, mentor_id")
          .eq("id", data.thread_id)
          .maybeSingle();
        if (thread) {
          const recipientId = thread.learner_id === userId ? thread.mentor_id : thread.learner_id;
          const { data: profs } = await supabaseAdmin
            .from("profiles")
            .select("id, email, first_name, last_name, display_name")
            .in("id", [recipientId, userId]);
          const recipient = profs?.find((p) => p.id === recipientId) ?? null;
          const sender = profs?.find((p) => p.id === userId) ?? null;
          if (recipient?.email) {
            const { data: tmpl } = await supabaseAdmin
              .from("email_templates")
              .select("subject, body")
              .eq("purpose", "urgent_message")
              .maybeSingle();
            if (tmpl) {
              const senderName = counterpartName(sender as never);
              const recipientFirst = recipient.first_name?.trim() || "there";
              const trimmed = (data.body ?? "").trim();
              const snippet = trimmed.length > 50 ? trimmed.slice(0, 50).trimEnd() + "…" : trimmed;
              const threadUrl = `https://fishtrippers.com/dashboard/messages/${data.thread_id}`;
              const fill = (s: string) =>
                s
                  .replaceAll("{{recipient_first_name}}", recipientFirst)
                  .replaceAll("{{sender_name}}", senderName)
                  .replaceAll("{{snippet}}", snippet)
                  .replaceAll("{{thread_url}}", threadUrl);
              const { sendEmail } = await import("@/lib/email-sender.server");
              await sendEmail({
                to: recipient.email,
                subject: fill(tmpl.subject),
                body: fill(tmpl.body),
              });
            }
          }
        }
      } catch (err) {
        console.error("[sendMessage] urgent email failed", err);
      }
    }

    return row as MessageRow;
  });

export const sendPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ thread_id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }): Promise<MessageRow> => {
    const { supabase, userId } = context;

    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .select("id, mentor_id, journey_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (tErr || !thread) throw new Error("Conversation not found.");
    if (thread.mentor_id !== userId)
      throw new Error("Only the Aide can send a payment link.");
    if (!thread.journey_id) throw new Error("This conversation has no course.");

    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        thread_id: data.thread_id,
        sender_id: userId,
        body: "Tap to check out 💳",
        attachment_type: "payment_link",
        payment_link_journey_id: thread.journey_id,
      })
      .select("id, thread_id, sender_id, body, attachment_type, payment_link_journey_id, booking_id, attachment_url, attachment_name, attachment_mime, attachment_size_bytes, read_status, is_urgent, created_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not send payment link.");
    return row as MessageRow;
  });

export const markThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ thread_id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("messages")
      .update({ read_status: true })
      .eq("thread_id", data.thread_id)
      .neq("sender_id", userId)
      .eq("read_status", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ count: number }> => {
    // Optional auth: tolerate logged-out / pre-hydration calls so we never
    // throw a Response (which surfaces as a global runtime error).
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const { createClient } = await import("@supabase/supabase-js");
      const req = getRequest();
      const auth = req?.headers?.get("authorization");
      if (!auth?.startsWith("Bearer ")) return { count: 0 };
      const token = auth.slice(7);
      if (!token) return { count: 0 };
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return { count: 0 };
      const supabase = createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: claims } = await supabase.auth.getClaims(token);
      const userId = claims?.claims?.sub;
      if (!userId) return { count: 0 };
      const { data: threads, error: tErr } = await supabase
        .from("message_threads")
        .select("id")
        .or(`learner_id.eq.${userId},mentor_id.eq.${userId}`);
      if (tErr || !threads?.length) return { count: 0 };
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("thread_id", threads.map((t) => t.id))
        .eq("read_status", false)
        .neq("sender_id", userId);
      return { count: count ?? 0 };
    } catch (e) {
      console.error("[getUnreadCount]", e);
      return { count: 0 };
    }
  });

export const ensureThreadForJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journey_id: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }): Promise<{ thread_id: string }> => {
    const { supabase, userId } = context;

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("id, mentor_id")
      .eq("id", data.journey_id)
      .maybeSingle();
    if (jErr || !journey) throw new Error("Course not found.");
    if (journey.mentor_id === userId)
      throw new Error("You can't message yourself.");

    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("learner_id", userId)
      .eq("mentor_id", journey.mentor_id)
      .eq("journey_id", journey.id)
      .maybeSingle();

    if (existing) return { thread_id: existing.id };

    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .insert({
        learner_id: userId,
        mentor_id: journey.mentor_id,
        journey_id: journey.id,
      })
      .select("id")
      .single();
    if (tErr || !thread) throw new Error(tErr?.message ?? "Could not start conversation.");
    return { thread_id: thread.id };
  });

export const ensureThreadForAideWithLearner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journey_id: z.string().uuid(),
        learner_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ thread_id: string }> => {
    const { supabase, userId } = context;

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("id, mentor_id")
      .eq("id", data.journey_id)
      .maybeSingle();
    if (jErr || !journey) throw new Error("Course not found.");
    if (journey.mentor_id !== userId)
      throw new Error("You can only message learners enrolled in your courses.");
    if (data.learner_id === userId)
      throw new Error("You can't message yourself.");

    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("learner_id", data.learner_id)
      .eq("mentor_id", userId)
      .eq("journey_id", journey.id)
      .maybeSingle();

    if (existing) return { thread_id: existing.id };

    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .insert({
        learner_id: data.learner_id,
        mentor_id: userId,
        journey_id: journey.id,
      })
      .select("id")
      .single();
    if (tErr || !thread)
      throw new Error(tErr?.message ?? "Could not start conversation.");
    return { thread_id: thread.id };
  });

const ALLOWED_EXT = ["pdf", "doc", "docx", "txt", "xls", "xlsx", "csv", "jpg", "jpeg", "png"];
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export const sendFileMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      thread_id: z.string().uuid(),
      url: z.string().url().max(2048),
      name: z.string().trim().min(1).max(255),
      mime: z.string().trim().min(1).max(255),
      size_bytes: z.number().int().min(1).max(5 * 1024 * 1024),
    }).parse(input)
  )
  .handler(async ({ data, context }): Promise<MessageRow> => {
    const ext = data.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) throw new Error("File type not allowed.");
    if (!ALLOWED_MIME.has(data.mime)) throw new Error("File type not allowed.");

    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        thread_id: data.thread_id,
        sender_id: userId,
        body: data.name,
        attachment_type: "file",
        attachment_url: data.url,
        attachment_name: data.name,
        attachment_mime: data.mime,
        attachment_size_bytes: data.size_bytes,
      })
      .select("id, thread_id, sender_id, body, attachment_type, payment_link_journey_id, booking_id, attachment_url, attachment_name, attachment_mime, attachment_size_bytes, read_status, is_urgent, created_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not send file.");
    return row as MessageRow;
  });

export const setThreadArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      thread_id: z.string().uuid(),
      archived: z.boolean(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .select("id, learner_id, mentor_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (tErr || !thread) throw new Error("Conversation not found.");
    const isLearner = thread.learner_id === userId;
    const isMentor = thread.mentor_id === userId;
    if (!isLearner && !isMentor) throw new Error("Not a participant.");
    const ts = data.archived ? new Date().toISOString() : null;
    const patch = isLearner
      ? { learner_archived_at: ts }
      : { mentor_archived_at: ts };
    const { error } = await supabase
      .from("message_threads")
      .update(patch)
      .eq("id", data.thread_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
