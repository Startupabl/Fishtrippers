import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tripRequestSchema = z.object({
  trip_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  duration_hours: z.number().int().min(1).max(72),
  guests: z.number().int().min(1).max(50),
  message: z.string().trim().min(1).max(2000),
});

export type SubmitTripRequestInput = z.infer<typeof tripRequestSchema>;

export const submitTripRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tripRequestSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ thread_id: string }> => {
    const { supabase, userId } = context;

    // 1. Look up the trip + operator owner
    const { data: trip, error: tErr } = await supabase
      .from("trip_packages")
      .select("id, title, operator_id, operators ( owner_id, display_name )")
      .eq("id", data.trip_id)
      .maybeSingle();
    if (tErr || !trip) throw new Error("Trip not found.");
    const ownerId = (trip as any).operators?.owner_id as string | undefined;
    if (!ownerId) throw new Error("Trip host not found.");
    if (ownerId === userId) throw new Error("You can't request your own trip.");

    // 2. Find or create a thread between learner (tripper) and mentor (host)
    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("learner_id", userId)
      .eq("mentor_id", ownerId)
      .is("journey_id", null)
      .maybeSingle();

    let threadId: string;
    if (existing) {
      threadId = existing.id as string;
    } else {
      const { data: thread, error: thErr } = await supabase
        .from("message_threads")
        .insert({
          learner_id: userId,
          mentor_id: ownerId,
          journey_id: null,
        })
        .select("id")
        .single();
      if (thErr || !thread) throw new Error(thErr?.message ?? "Could not start conversation.");
      threadId = thread.id as string;
    }

    // 3. Post the formatted request as a message
    const time = data.start_time ? ` at ${data.start_time}` : "";
    const body = [
      `🎣 **Trip request: ${(trip as any).title}**`,
      "",
      `• Date: ${data.date}${time}`,
      `• Duration: ${data.duration_hours} hour${data.duration_hours === 1 ? "" : "s"}`,
      `• Guests: ${data.guests}`,
      "",
      data.message,
    ].join("\n");

    const { error: mErr } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: userId,
      body,
      attachment_type: "trip_request" as any,
    } as any);
    if (mErr) throw new Error(mErr.message);

    return { thread_id: threadId };
  });
