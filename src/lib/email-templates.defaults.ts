// Source of truth for built-in email templates. Used by the "Reset to default"
// button in the admin manager. Keep in sync with the seed migration.

export type EmailTemplatePurpose =
  | "welcome_user"
  | "email_verification"
  | "password_reset"
  | "magic_link"
  | "new_chat_message"
  | "custom_offer_received"
  | "booking_confirmed_aide"
  | "booking_confirmed_learner"
  | "listing_approved"
  | "listing_rejected_notification"
  | "payout_sent"
  | "urgent_message";

export interface EmailTemplateDefault {
  display_name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
}

export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplatePurpose, EmailTemplateDefault> = {
  welcome_user: {
    display_name: "Welcome Email",
    description: "Sent when a new user completes signup.",
    subject: "Welcome to FishTrippers, {{first_name}}!",
    body: `Hi {{first_name}},

Welcome to FishTrippers! We're thrilled to have you join our community of anglers and captains.

Start exploring trips and connect with captains today:
{{app_url}}

— The FishTrippers Team`,
    variables: ["first_name", "app_url"],
  },
  email_verification: {
    display_name: "Email Verification",
    description: "Sent to confirm a user's email address.",
    subject: "Verify your FishTrippers email address",
    body: `Hi {{first_name}},

Please confirm your email address to activate your FishTrippers account:

{{verification_url}}

This link will expire in 24 hours.

— The FishTrippers Team`,
    variables: ["first_name", "verification_url"],
  },
  password_reset: {
    display_name: "Password Reset",
    description: "Sent when a user requests a password reset.",
    subject: "Reset your FishTrippers password",
    body: `Hi {{first_name}},

We received a request to reset your FishTrippers password. Click the link below to choose a new one:

{{reset_url}}

If you didn't request this, you can safely ignore this email.

— The FishTrippers Team`,
    variables: ["first_name", "reset_url"],
  },
  magic_link: {
    display_name: "Magic Sign-in Link",
    description: "Passwordless sign-in link.",
    subject: "Your FishTrippers sign-in link",
    body: `Hi {{first_name}},

Click the link below to sign in to FishTrippers:

{{magic_link}}

This link expires in 15 minutes.

— The FishTrippers Team`,
    variables: ["first_name", "magic_link"],
  },
  new_chat_message: {
    display_name: "New Chat Message",
    description: "Notifies a user when they receive a new direct message.",
    subject: "New message from {{sender_name}}",
    body: `Hi {{recipient_first_name}},

You have a new message from {{sender_name}}.

Read and reply here:
{{thread_url}}`,
    variables: ["recipient_first_name", "sender_name", "thread_url"],
  },
  custom_offer_received: {
    display_name: "Custom Offer Received",
    description: "Sent to a learner when an instructor sends them a custom offer.",
    subject: "New custom offer from {{aide_name}}",
    body: `Hi {{learner_first_name}},

{{aide_name}} sent you a custom offer for "{{course_title}}".

Review and accept it here:
{{offer_url}}`,
    variables: ["learner_first_name", "aide_name", "course_title", "offer_url"],
  },
  booking_confirmed_aide: {
    display_name: "Booking Confirmed (Instructor)",
    description: "Sent to the instructor when a learner confirms and pays for a booking.",
    subject: 'New student booking confirmed for "{{course_title}}"',
    body: `Hi {{aide_first_name}},

Great news — {{learner_name}} just booked a seat in "{{course_title}}"!

Check your schedule and updated roster:
{{schedule_url}}`,
    variables: ["aide_first_name", "learner_name", "course_title", "schedule_url"],
  },
  booking_confirmed_learner: {
    display_name: "Booking Confirmed (Learner)",
    description: "Sent to the learner after a successful booking payment.",
    subject: 'Your booking for "{{course_title}}" is confirmed',
    body: `Hi {{learner_first_name}},

Your seat in "{{course_title}}" is officially reserved. We can't wait for you to get started!

View your schedule:
{{schedule_url}}`,
    variables: ["learner_first_name", "course_title", "schedule_url"],
  },
  listing_approved: {
    display_name: "Listing Approved",
    description: "Sent to an instructor when their course listing is approved.",
    subject: 'Your listing "{{course_title}}" is now live',
    body: `Hi {{aide_first_name}},

Your listing "{{course_title}}" has been approved and is now live on Lumin!

View your listing:
{{listing_url}}`,
    variables: ["aide_first_name", "course_title", "listing_url"],
  },
  listing_rejected_notification: {
    display_name: "Listing Rejected (Notification)",
    description: "Sent to an instructor when their course listing is sent back to draft with admin feedback.",
    subject: "Update regarding your FishTrippers listing: {{listing_title}}",
    body: `Hi {{user_name}},

Thank you for submitting your listing, {{listing_title}}! Our team reviewed your submission and needs a quick update before it can go live:

"{{review_notes}}"

Please log into your dashboard, click the '⚠️ Action Needed' row to address this feedback, and resubmit!`,
    variables: ["user_name", "listing_title", "review_notes", "edit_url"],
  },
  payout_sent: {
    display_name: "Payout Sent",
    description: "Sent to an instructor when a payout has been processed.",
    subject: "Your payout of {{amount}} is on the way",
    body: `Hi {{aide_first_name}},

A payout of {{amount}} was sent to your bank account on {{payout_date}}.

Thank you for teaching on Lumin!`,
    variables: ["aide_first_name", "amount", "payout_date"],
  },
  urgent_message: {
    display_name: "Urgent Message",
    description: "Sent when a user marks a chat message as urgent. Includes a short snippet and a link to the thread.",
    subject: "🚨 Urgent message from {{sender_name}}",
    body: `Hi {{recipient_first_name}},

{{sender_name}} has marked this message as urgent.

"{{snippet}}"

View the full conversation:
{{thread_url}}`,
    variables: ["recipient_first_name", "sender_name", "snippet", "thread_url"],
  },
};

/** Replace {{variable}} tokens with values. Missing keys are left as-is. */
export function renderTemplateString(template: string, vars: Record<string, string | number | undefined | null>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? `{{${key}}}` : String(v);
  });
}
