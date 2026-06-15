// Source of truth for built-in header-bell alert templates. Keep in sync
// with the seed migration. Short, single-line copy only.

export type AlertTemplatePurpose =
  | "booking_confirmed"
  | "new_message"
  | "listing_approved"
  | "listing_rejected_alert"
  | "custom_offer_received"
  | "payout_sent"
  | "booking_confirmed_learner";

export interface AlertTemplateDefault {
  display_name: string;
  description: string;
  message: string;
  variables: string[];
}

export const ALERT_TEMPLATE_DEFAULTS: Record<AlertTemplatePurpose, AlertTemplateDefault> = {
  booking_confirmed: {
    display_name: "New Booking (Instructor)",
    description: "Shown in the instructor's header bell when a learner books their course.",
    message:
      'New student booking confirmed for "{{course_title}}"! Check your schedule to view your updated roster.',
    variables: ["course_title"],
  },
  new_message: {
    display_name: "New Direct Message",
    description: "Shown when a user receives a new chat message.",
    message: "New message from {{sender_name}}.",
    variables: ["sender_name"],
  },
  listing_approved: {
    display_name: "Listing Approved",
    description: "Shown to an instructor when their listing is approved.",
    message: 'Your listing "{{course_title}}" is now live!',
    variables: ["course_title"],
  },
  listing_rejected_alert: {
    display_name: "Listing Rejected (Alert)",
    description: "Shown in the instructor's header bell when their listing is sent back to draft.",
    message: "Your listing '{{listing_title}}' needs a quick update before approval.",
    variables: ["listing_title"],
  },
  custom_offer_received: {
    display_name: "Custom Offer Received",
    description: "Shown to a learner when they receive a custom offer.",
    message: '{{aide_name}} sent you a custom offer for "{{course_title}}".',
    variables: ["aide_name", "course_title"],
  },
  payout_sent: {
    display_name: "Payout Sent",
    description: "Shown to an instructor when a payout is processed.",
    message: "Payout of {{amount}} sent to your bank account.",
    variables: ["amount"],
  },
  booking_confirmed_learner: {
    display_name: "Booking Confirmed (Learner)",
    description: "Shown to a learner after a successful booking.",
    message: 'Your booking for "{{course_title}}" is confirmed!',
    variables: ["course_title"],
  },
};
