import { z } from "zod";

export type PromoDiscount =
  | { type: "percent"; value: 10 }
  | { type: "percent"; value: 20 }
  | { type: "fixed"; value: 1000; currency: string };

export interface PromoCode {
  code: string;
  discount: PromoDiscount;
  active: boolean;
}

export function formatPromoCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 20);
}

export const promoCodeSchema = z
  .string()
  .min(3, "At least 3 characters")
  .max(20, "Max 20 characters")
  .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, _ or -");

export function formatDiscountLabel(d: PromoDiscount): string {
  if (d.type === "percent") return `${d.value}% off`;
  // fixed: minor units → display
  return `$${(d.value / 100).toFixed(0)} off`;
}

export const DISCOUNT_OPTIONS: { id: string; label: string; value: PromoDiscount }[] = [
  { id: "p10", label: "10% off", value: { type: "percent", value: 10 } },
  { id: "p20", label: "20% off", value: { type: "percent", value: 20 } },
  { id: "f10", label: "$10 off", value: { type: "fixed", value: 1000, currency: "USD" } },
];

export function buildShareText(opts: {
  code: string;
  discount: PromoDiscount;
  publicUrl: string;
}): string {
  return `Use code ${opts.code} for ${formatDiscountLabel(opts.discount)} my new Lemonaidely path 🎉 ${opts.publicUrl}`;
}

export function applyDiscount(priceMinor: number, d: PromoDiscount): number {
  if (d.type === "percent") {
    return Math.max(0, Math.round(priceMinor * (1 - d.value / 100)));
  }
  return Math.max(0, priceMinor - d.value);
}
