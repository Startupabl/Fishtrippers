import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchPublicMentorProfile, type PublicMentorProfile } from "./mentor-profile.server";

export type { PublicMentorProfile };

export const getPublicMentorProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<PublicMentorProfile | null> => {
    return fetchPublicMentorProfile(data.user_id);
  });
