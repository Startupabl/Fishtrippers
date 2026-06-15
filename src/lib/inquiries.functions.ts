import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInquiryInput = z.object({
  journey_id: z.string().uuid(),
  preferred_date: z.string().min(4).max(40), // ISO date string
  preferred_time: z.enum(["morning", "afternoon", "evening", "flexible"]),
  message_body: z.string().trim().min(10).max(1000),
});

export const createInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInquiryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("id, mentor_id, title, status")
      .eq("id", data.journey_id)
      .maybeSingle();

    if (jErr || !journey) throw new Error("Course not found.");
    if (journey.status !== "published")
      throw new Error("Course is not available for booking.");
    if (journey.mentor_id === userId)
      throw new Error("You can't inquire on your own course.");

    // Insert inquiry
    const { error: iErr } = await supabase.from("inquiries").insert({
      learner_id: userId,
      aide_id: journey.mentor_id,
      course_id: journey.id,
      preferred_time: `${data.preferred_date} · ${data.preferred_time}`,
      message_body: data.message_body,
      status: "pending",
    });
    if (iErr) {
      console.error("[createInquiry insert]", iErr);
      throw new Error(iErr.message);
    }

    // Find or create thread
    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("learner_id", userId)
      .eq("mentor_id", journey.mentor_id)
      .eq("journey_id", journey.id)
      .maybeSingle();

    let threadId: string;
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: thread, error: tErr } = await supabase
        .from("message_threads")
        .insert({
          learner_id: userId,
          mentor_id: journey.mentor_id,
          journey_id: journey.id,
        })
        .select("id")
        .single();
      if (tErr || !thread) {
        console.error("[createInquiry thread]", tErr);
        throw new Error(tErr?.message ?? "Could not start conversation.");
      }
      threadId = thread.id;
    }

    const formatted = `Hi! I'm interested in "${journey.title}" starting ${data.preferred_date} (${data.preferred_time}).\n\nGoals: ${data.message_body}`;

    const { error: mErr } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: userId,
      body: formatted,
      attachment_type: "none",
    });
    if (mErr) {
      console.error("[createInquiry message]", mErr);
      throw new Error(mErr.message);
    }

    return { thread_id: threadId };
  });
