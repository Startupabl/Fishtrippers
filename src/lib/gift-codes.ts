import { z } from "zod";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // exclude 0/O/1/I/L

function randInt(max: number): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function block(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[randInt(ALPHABET.length)];
  return out;
}

/** Produces e.g. "GIFT-9KQ4-7XBM" */
export function generateGiftCode(): string {
  return `GIFT-${block(4)}-${block(4)}`;
}

export function formatGiftCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16);
}

export const giftDetailsSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(1, "Required")
    .max(80, "Max 80 characters"),
  recipientEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255, "Max 255 characters"),
  message: z
    .string()
    .trim()
    .max(500, "Max 500 characters")
    .optional()
    .or(z.literal("")),
  fromName: z
    .string()
    .trim()
    .max(80, "Max 80 characters")
    .optional()
    .or(z.literal("")),
});

export type GiftDetails = z.infer<typeof giftDetailsSchema>;
