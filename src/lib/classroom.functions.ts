import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DAILY_ROOM_NAME = "lemonaidely";
const DAILY_ROOM_BASE_URL = `https://lemonaidely.daily.co/${DAILY_ROOM_NAME}`;

export interface DailyJoinInfo {
  role: "aide" | "learner";
  room_url: string;
  user_name: string;
  listing_title: string;
  class_session_id: string;
  is_live: boolean;
}

const Input = z.object({ order_id: z.string().uuid() });

async function mintMeetingToken(opts: {
  userId: string;
  userName: string;
  isOwner: boolean;
}): Promise<string> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error("Could not start classroom session.");

  const res = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: DAILY_ROOM_NAME,
        is_owner: opts.isOwner,
        user_name: opts.userName,
        user_id: opts.userId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4, // 4h
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[daily] meeting-tokens failed:", res.status, body);
    throw new Error("Could not start classroom session.");
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error("Could not start classroom session.");
  return json.token;
}

export const getDailyJoinInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }): Promise<DailyJoinInfo | null> => {
    const { supabase, userId } = context;

    const { data: order } = await supabase
      .from("orders")
      .select("learner_id, mentor_id, booking_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    const role: "aide" | "learner" =
      order.mentor_id === userId
        ? "aide"
        : order.learner_id === userId
          ? "learner"
          : (() => {
              throw new Error("Not authorized.");
            })();

    if (!order.booking_id) return null;

    const { data: booking } = await supabase
      .from("bookings")
      .select("class_session_id")
      .eq("id", order.booking_id)
      .maybeSingle();
    if (!booking?.class_session_id) return null;

    const { data: cs } = await supabaseAdmin
      .from("class_sessions")
      .select("id, listing_title, is_live")
      .eq("id", booking.class_session_id)
      .maybeSingle();
    if (!cs) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, display_name, email")
      .eq("id", userId)
      .maybeSingle();
    const userName =
      profile?.display_name?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      profile?.email?.split("@")[0] ||
      "Guest";

    const token = await mintMeetingToken({
      userId,
      userName,
      isOwner: role === "aide",
    });
    const roomUrl = `${DAILY_ROOM_BASE_URL}?t=${encodeURIComponent(token)}`;

    return {
      role,
      room_url: roomUrl,
      user_name: userName,
      listing_title: cs.listing_title,
      class_session_id: cs.id,
      is_live: (cs as any).is_live ?? false,
    };
  });
