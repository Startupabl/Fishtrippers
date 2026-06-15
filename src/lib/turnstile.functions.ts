import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

const Input = z.object({ token: z.string().min(1).max(4096) });

export const verifyTurnstile = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return { success: false };

    let remoteip = "";
    try {
      remoteip = getRequestIP({ xForwardedFor: true }) ?? "";
    } catch {}

    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", data.token);
    if (remoteip) form.set("remoteip", remoteip);

    try {
      const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body: form },
      );
      const json = (await res.json()) as { success?: boolean };
      return { success: Boolean(json.success) };
    } catch {
      return { success: false };
    }
  });
