import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Daily cleanup of old chat messages and empty threads.
 *
 * Rules:
 *  - Delete messages older than 90 days where attachment_type = 'none'
 *    (chat only — payment_link messages are part of booking history and kept)
 *  - Delete message_threads with zero remaining messages
 *  - Orders / payments live in `orders` and are NOT touched
 *
 * Called by pg_cron every 24 hours.
 */
export const Route = createFileRoute("/api/public/hooks/cleanup-old-messages")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require a shared secret to prevent unauthenticated mass deletion.
        const expected = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-token") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const cutoff = new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString();

        // 1. Delete old chat messages
        const { data: deletedMsgs, error: delMsgErr } = await supabaseAdmin
          .from("messages")
          .delete()
          .lt("created_at", cutoff)
          .eq("attachment_type", "none")
          .select("id");
        if (delMsgErr) {
          console.error("cleanup: delete messages failed", delMsgErr);
          return new Response(
            JSON.stringify({ error: delMsgErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        // 2. Find threads with no messages left, delete them
        const { data: threads, error: tErr } = await supabaseAdmin
          .from("message_threads")
          .select("id");
        if (tErr) {
          console.error("cleanup: list threads failed", tErr);
          return new Response(
            JSON.stringify({ error: tErr.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const emptyThreadIds: string[] = [];
        for (const t of threads ?? []) {
          const { count } = await supabaseAdmin
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", t.id);
          if ((count ?? 0) === 0) emptyThreadIds.push(t.id);
        }

        let deletedThreads = 0;
        if (emptyThreadIds.length) {
          const { error: dtErr } = await supabaseAdmin
            .from("message_threads")
            .delete()
            .in("id", emptyThreadIds);
          if (dtErr) {
            console.error("cleanup: delete empty threads failed", dtErr);
          } else {
            deletedThreads = emptyThreadIds.length;
          }
        }

        return Response.json({
          deleted_messages: deletedMsgs?.length ?? 0,
          deleted_threads: deletedThreads,
          cutoff,
        });
      },
    },
  },
});
