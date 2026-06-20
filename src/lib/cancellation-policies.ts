export type CancellationPolicyKey = "flexible" | "moderate" | "strict";

export const CANCELLATION_POLICY_COPY: Record<CancellationPolicyKey, { label: string; text: string }> = {
  flexible: {
    label: "Flexible",
    text: "Free cancellation up to 24 hours before departure (deposit refunded). Inside 24 hours, a 50% cancellation fee of the total trip price is charged to the card on file.",
  },
  moderate: {
    label: "Moderate",
    text: "Free cancellation 7+ days before departure. Between 7 days and 24 hours: 50% cancellation fee. Inside 24 hours: 90% cancellation fee (the full remaining balance).",
  },
  strict: {
    label: "Strict",
    text: "Free cancellation 14+ days before departure. Inside 14 days: 90% cancellation fee (the full remaining balance).",
  },
};


export function getCancellationPolicy(
  key: CancellationPolicyKey | string | null | undefined,
): { label: string; text: string } {
  if (key && (key === "flexible" || key === "moderate" || key === "strict")) {
    return CANCELLATION_POLICY_COPY[key];
  }
  return CANCELLATION_POLICY_COPY.moderate;
}
