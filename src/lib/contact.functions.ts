import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const ContactTopics = [
  "General",
  "Booking help",
  "Hosting/Listing",
  "Press",
  "Other",
] as const;

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum(ContactTopics),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ContactSchema.parse(input))
  .handler(async ({ data }) => {
    // Honeypot tripped — silently succeed
    if (data.website && data.website.length > 0) {
      return { ok: true as const };
    }

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
    });

    if (error) {
      throw new Error("Could not send your message. Please try again.");
    }

    return { ok: true as const };
  });
