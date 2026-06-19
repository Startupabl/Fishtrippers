export type CancellationPolicyKey = "flexible" | "moderate" | "strict";

export const CANCELLATION_POLICY_COPY: Record<CancellationPolicyKey, { label: string; text: string }> = {
  flexible: {
    label: "Flexible",
    text: "Full refund of your deposit if you cancel at least 24 hours before the trip. Cancellations within 24 hours forfeit the deposit.",
  },
  moderate: {
    label: "Moderate",
    text: "Full refund of your deposit if you cancel at least 7 days before the trip. Cancellations within 7 days forfeit the deposit.",
  },
  strict: {
    label: "Strict",
    text: "Deposit is non-refundable. The remaining balance is only due if the trip sails as scheduled.",
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
