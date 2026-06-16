// My Schedule server functions: list all sessions the Aide created (booked
// or unbooked, from both Schedule Live Course cohorts and Custom Offers),
// edit/delete unbooked slots, and run the reschedule-with-learner-consent
// workflow for booked slots.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types ----------

export interface ScheduleStudent {
  id: string;
  name: string;
  email: string | null;
  orderId: string | null;
  bookingId: string | null;
  threadId: string | null;
}

export interface PendingReschedule {
  proposed_starts_at: string;
  proposed_duration_minutes: number;
  requested_at: string;
  requested_by_aide_id: string;
}

export interface ScheduleRow {
  key: string;
  classSessionId: string;
  slotIndex: number;
  source: "cohort" | "custom_offer";
  startIso: string;
  durationMinutes: number;
  listingTitle: string;
  courseId: string | null;
  status: "unbooked" | "booked" | "pending_reschedule";
  students: ScheduleStudent[];
  pendingReschedule: PendingReschedule | null;
  sessionSlotCount: number;
  maxSeats: number;
  filledSeats: number;
}

interface SlotJson {
  starts_at: string;
  duration_minutes?: number;
  pending_reschedule?: PendingReschedule | null;
}

function nameFromProfile(p: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  return (
    p.display_name?.trim() ||
    [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
    p.email?.split("@")[0] ||
    "Learner"
  );
}

// ---------- List ----------

export const listAideScheduleRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScheduleRow[]> => {
    const { supabase, userId } = context;

    const { data: sessions, error: sErr } = await supabase
      .from("class_sessions")
      .select(
        "id, listing_title, course_id, session_dates_times_array, is_public_cohort, status, max_seats",
      )
      .eq("aide_id", userId)
      .neq("status", "cancelled");
    if (sErr) {
      console.error("[listAideScheduleRows]", sErr);
      return [];
    }
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length === 0) return [];

    // Bookings (custom offers): pending_offer / pending_payment / confirmed.
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, class_session_id, learner_id, status, thread_id")
      .in("class_session_id", sessionIds)
      .neq("status", "declined");

    // Paid orders linked to these sessions (cohort flow).
    const { data: orders } = await supabase
      .from("orders")
      .select("id, learner_id, journey_id")
      .eq("mentor_id", userId)
      .in("journey_id", (sessions ?? []).map((s) => s.course_id).filter(Boolean) as string[]);
    // Note: orders aren't directly tied to class_session_id, so we additionally
    // match by booking_id below.
    const { data: ordersByBooking } = await supabase
      .from("orders")
      .select("id, learner_id, booking_id")
      .eq("mentor_id", userId)
      .in("booking_id", (bookings ?? []).map((b) => b.id));

    const learnerIds = new Set<string>();
    (bookings ?? []).forEach((b) => learnerIds.add(b.learner_id));
    (orders ?? []).forEach((o) => learnerIds.add(o.learner_id));
    (ordersByBooking ?? []).forEach((o) => learnerIds.add(o.learner_id));

    const profilesById = new Map<
      string,
      { first_name: string | null; last_name: string | null; display_name: string | null; email: string | null }
    >();
    if (learnerIds.size > 0) {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, display_name, email")
        .in("id", Array.from(learnerIds));
      (profs ?? []).forEach((p) => profilesById.set(p.id, p));
    }

    const now = Date.now();
    const rows: ScheduleRow[] = [];

    for (const cs of sessions ?? []) {
      const slots = (cs.session_dates_times_array as unknown as SlotJson[] | null) ?? [];
      const linkedBookings = (bookings ?? []).filter(
        (b) => b.class_session_id === cs.id,
      );
      // Source label derives strictly from is_public_cohort.



      // Build a single students list for this session. Cohorts share the
      // same roster across all slots; custom offers usually have a single
      // learner. We keep the implementation simple by grouping all bookings
      // and orders for this class_session.
      const students: ScheduleStudent[] = [];
      const seen = new Set<string>();

    for (const b of linkedBookings) {
        // Only confirmed (paid) bookings count as actual students.
        // Pending custom offers stay Unbooked until the learner pays.
        if (b.status !== "confirmed") continue;
        const p = profilesById.get(b.learner_id);
        const sid = `b:${b.learner_id}`;
        if (seen.has(sid)) continue;
        seen.add(sid);
        const matchingOrder = (ordersByBooking ?? []).find(
          (o) => o.booking_id === b.id,
        );
        students.push({
          id: b.learner_id,
          name: p ? nameFromProfile(p) : "Learner",
          email: p?.email ?? null,
          bookingId: b.id,
          orderId: matchingOrder?.id ?? null,
          threadId: b.thread_id,
        });
      }

      // Cohort path: orders tied by journey_id (only when public cohort).
      if (cs.is_public_cohort && cs.course_id) {
        const cohortOrders = (orders ?? []).filter(
          (o) => o.journey_id === cs.course_id,
        );
        for (const o of cohortOrders) {
          const p = profilesById.get(o.learner_id);
          const sid = `o:${o.learner_id}`;
          if (seen.has(sid)) continue;
          seen.add(sid);
          students.push({
            id: o.learner_id,
            name: p ? nameFromProfile(p) : "Learner",
            email: p?.email ?? null,
            bookingId: null,
            orderId: o.id,
            threadId: null,
          });
        }
      }

      const booked = students.length > 0;

      slots.forEach((slot, idx) => {
        const startMs = new Date(slot.starts_at).getTime();
        // Past unbooked slots auto-hide.
        if (!booked && startMs < now) return;

        const pending = slot.pending_reschedule ?? null;
        const status: ScheduleRow["status"] = pending
          ? "pending_reschedule"
          : booked
            ? "booked"
            : "unbooked";

        rows.push({
          key: `${cs.id}:${idx}`,
          classSessionId: cs.id,
          slotIndex: idx,
          source: cs.is_public_cohort ? "cohort" : "custom_offer",
          startIso: slot.starts_at,
          durationMinutes: slot.duration_minutes ?? 45,
          listingTitle: cs.listing_title,
          courseId: cs.course_id,
          status,
          students,
          pendingReschedule: pending,
          sessionSlotCount: slots.length,
          maxSeats: cs.max_seats ?? 1,
          filledSeats: students.length,
        });
      });
    }

    rows.sort(
      (a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime(),
    );
    return rows;
  });

// ---------- Edit / Delete (unbooked only) ----------

const DURATION_PRESETS = [30, 45, 60, 90, 120] as const;

const EditSlotInput = z.object({
  class_session_id: z.string().uuid(),
  slot_index: z.number().int().min(0).max(50),
  starts_at: z.string().min(10),
  duration_minutes: z.number().int().refine(
    (v) => (DURATION_PRESETS as readonly number[]).includes(v),
    { message: "Duration must be one of 30, 45, 60, 90, 120." },
  ),
});

async function assertNoBookings(
  supabase: ReturnType<
    typeof import("@supabase/supabase-js").createClient
  >,
  classSessionId: string,
): Promise<void> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("class_session_id", classSessionId)
    .eq("status", "confirmed");
  if ((bookings ?? []).length > 0) {
    throw new Error(
      "This session already has a confirmed booking — use Reschedule instead.",
    );
  }
}

export const editUnbookedSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EditSlotInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cs, error } = await supabase
      .from("class_sessions")
      .select("id, aide_id, session_dates_times_array")
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (error || !cs) throw new Error("Session not found.");
    if (cs.aide_id !== userId) throw new Error("Not authorized.");
    await assertNoBookings(supabase as any, data.class_session_id);

    const slots = ((cs.session_dates_times_array as unknown as SlotJson[]) ?? []).slice();
    if (data.slot_index < 0 || data.slot_index >= slots.length)
      throw new Error("Slot not found.");
    slots[data.slot_index] = {
      ...slots[data.slot_index],
      starts_at: data.starts_at,
      duration_minutes: data.duration_minutes,
    };

    const { error: uErr } = await supabase
      .from("class_sessions")
      .update({ session_dates_times_array: slots as unknown as never })
      .eq("id", data.class_session_id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

const DeleteSlotInput = z.object({
  class_session_id: z.string().uuid(),
  slot_index: z.number().int().min(0).max(50),
});

export const deleteUnbookedSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteSlotInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cs, error } = await supabase
      .from("class_sessions")
      .select("id, aide_id, session_dates_times_array")
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (error || !cs) throw new Error("Session not found.");
    if (cs.aide_id !== userId) throw new Error("Not authorized.");
    await assertNoBookings(supabase as any, data.class_session_id);

    const slots = ((cs.session_dates_times_array as unknown as SlotJson[]) ?? []).slice();
    if (data.slot_index < 0 || data.slot_index >= slots.length)
      throw new Error("Slot not found.");
    slots.splice(data.slot_index, 1);

    if (slots.length === 0) {
      // Archive the empty session; decline any pending offer.
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await supabaseAdmin
        .from("class_sessions")
        .update({ status: "cancelled", session_dates_times_array: [] })
        .eq("id", data.class_session_id);
      await supabaseAdmin
        .from("bookings")
        .update({ status: "declined" })
        .eq("class_session_id", data.class_session_id)
        .eq("status", "pending_offer");
    } else {
      const { error: uErr } = await supabase
        .from("class_sessions")
        .update({ session_dates_times_array: slots as unknown as never })
        .eq("id", data.class_session_id);
      if (uErr) throw new Error(uErr.message);
    }
    return { ok: true };
  });

const DeleteEntireInput = z.object({
  class_session_id: z.string().uuid(),
});

export const deleteEntireSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteEntireInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cs, error } = await supabase
      .from("class_sessions")
      .select("id, aide_id")
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (error || !cs) throw new Error("Session not found.");
    if (cs.aide_id !== userId) throw new Error("Not authorized.");
    await assertNoBookings(supabase as any, data.class_session_id);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin
      .from("class_sessions")
      .update({ status: "cancelled", session_dates_times_array: [] })
      .eq("id", data.class_session_id);
    await supabaseAdmin
      .from("bookings")
      .update({ status: "declined" })
      .eq("class_session_id", data.class_session_id)
      .in("status", ["pending_offer", "pending_payment"]);
    return { ok: true };
  });



// ---------- Reschedule (booked only) ----------

const RequestRescheduleInput = z.object({
  class_session_id: z.string().uuid(),
  slot_index: z.number().int().min(0).max(50),
  proposed_starts_at: z.string().min(10),
  proposed_duration_minutes: z.number().int().refine(
    (v) => (DURATION_PRESETS as readonly number[]).includes(v),
    { message: "Duration must be one of 30, 45, 60, 90, 120." },
  ),
});

function fmtWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} at ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return iso;
  }
}

export const requestReschedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RequestRescheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: cs, error } = await supabase
      .from("class_sessions")
      .select(
        "id, aide_id, listing_title, course_id, session_dates_times_array",
      )
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (error || !cs) throw new Error("Session not found.");
    if (cs.aide_id !== userId) throw new Error("Not authorized.");

    const slots = ((cs.session_dates_times_array as unknown as SlotJson[]) ?? []).slice();
    if (data.slot_index < 0 || data.slot_index >= slots.length)
      throw new Error("Slot not found.");
    if (slots[data.slot_index].pending_reschedule)
      throw new Error("A reschedule request is already pending for this slot.");

    const pending: PendingReschedule = {
      proposed_starts_at: data.proposed_starts_at,
      proposed_duration_minutes: data.proposed_duration_minutes,
      requested_at: new Date().toISOString(),
      requested_by_aide_id: userId,
    };
    slots[data.slot_index] = { ...slots[data.slot_index], pending_reschedule: pending };

    const { error: uErr } = await supabase
      .from("class_sessions")
      .update({ session_dates_times_array: slots as unknown as never })
      .eq("id", data.class_session_id);
    if (uErr) throw new Error(uErr.message);

    // Fan out alerts + emails to every booked learner.
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("learner_id")
      .eq("class_session_id", data.class_session_id)
      .neq("status", "declined");
    const { data: ordersForCohort } = cs.course_id
      ? await supabaseAdmin
          .from("orders")
          .select("learner_id")
          .eq("mentor_id", userId)
          .eq("journey_id", cs.course_id)
      : { data: [] as { learner_id: string }[] };

    const learnerIds = new Set<string>();
    (bookings ?? []).forEach((b) => learnerIds.add(b.learner_id));
    (ordersForCohort ?? []).forEach((o) => learnerIds.add(o.learner_id));

    if (learnerIds.size > 0) {
      const message = `Your Aide proposed a new time for "${cs.listing_title}" — ${fmtWhen(data.proposed_starts_at)}. Review and respond.`;
      const alertRows = Array.from(learnerIds).map((lid) => ({
        user_id: lid,
        kind: "reschedule_requested" as const,
        message,
        journey_id: cs.course_id ?? null,
      }));
      await supabaseAdmin.from("user_alerts").insert(alertRows);

      // Best-effort emails (don't fail the request if email is misconfigured).
      try {
        const { sendEmail } = await import("@/lib/email-sender.server");
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id, email, first_name")
          .in("id", Array.from(learnerIds));
        await Promise.all(
          (profs ?? []).map((p) => {
            if (!p.email) return null;
            return sendEmail({
              to: p.email,
              subject: `Reschedule request for "${cs.listing_title}"`,
              body: `Hi ${p.first_name ?? "there"},

Your Aide has proposed a new time for "${cs.listing_title}":

  Original time:  ${fmtWhen(slots[data.slot_index].starts_at)}
  Proposed time:  ${fmtWhen(data.proposed_starts_at)} (${data.proposed_duration_minutes} min)

Please review and accept or decline from your dashboard:
https://fishtrippers.com/dashboard/upcoming-sessions

— FishTrippers`,
            }).catch((e) => console.error("[requestReschedule email]", e));
          }),
        );
      } catch (e) {
        console.error("[requestReschedule email block]", e);
      }
    }

    return { ok: true, notified: learnerIds.size };
  });

const RespondInput = z.object({
  class_session_id: z.string().uuid(),
  slot_index: z.number().int().min(0).max(50),
  accept: z.boolean(),
});

function buildIcs(args: {
  uid: string;
  title: string;
  startIso: string;
  endIso: string;
}): string {
  const fmt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FishTrippers//Schedule//EN",
    "BEGIN:VEVENT",
    `UID:${args.uid}@fishtrippers.com`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(args.startIso)}`,
    `DTEND:${fmt(args.endIso)}`,
    `SUMMARY:${args.title.replace(/[\r\n]+/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const respondToReschedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RespondInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: cs, error } = await supabaseAdmin
      .from("class_sessions")
      .select(
        "id, aide_id, listing_title, course_id, session_dates_times_array, is_public_cohort",
      )
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (error || !cs) throw new Error("Session not found.");

    // Authz: caller must be a learner on this class session.
    const { data: myBooking } = await supabase
      .from("bookings")
      .select("id, thread_id")
      .eq("class_session_id", data.class_session_id)
      .eq("learner_id", userId)
      .maybeSingle();
    let threadId: string | null = myBooking?.thread_id ?? null;
    if (!myBooking) {
      if (!cs.course_id) throw new Error("Not authorized.");
      const { data: myOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("journey_id", cs.course_id)
        .eq("learner_id", userId)
        .limit(1)
        .maybeSingle();
      if (!myOrder) throw new Error("Not authorized.");
    }

    const slots = ((cs.session_dates_times_array as unknown as SlotJson[]) ?? []).slice();
    if (data.slot_index < 0 || data.slot_index >= slots.length)
      throw new Error("Slot not found.");
    const slot = slots[data.slot_index];
    const pending = slot.pending_reschedule;
    if (!pending) throw new Error("No reschedule request is pending.");

    if (data.accept) {
      slots[data.slot_index] = {
        starts_at: pending.proposed_starts_at,
        duration_minutes: pending.proposed_duration_minutes,
        pending_reschedule: null,
      };
    } else {
      slots[data.slot_index] = { ...slot, pending_reschedule: null };
    }

    await supabaseAdmin
      .from("class_sessions")
      .update({ session_dates_times_array: slots as unknown as never })
      .eq("id", data.class_session_id);

    // Notify the Aide.
    const learnerProfile = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, display_name, email")
      .eq("id", userId)
      .maybeSingle();
    const learnerName = learnerProfile.data
      ? nameFromProfile(learnerProfile.data)
      : "Your learner";

    const acceptMsg = `${learnerName} accepted your reschedule for "${cs.listing_title}" — ${fmtWhen(pending.proposed_starts_at)}.`;
    const declineMsg = `${learnerName} declined your reschedule for "${cs.listing_title}". Please message them to coordinate a different time.`;

    await supabaseAdmin.from("user_alerts").insert({
      user_id: cs.aide_id,
      kind: data.accept ? "reschedule_accepted" : "reschedule_declined",
      message: data.accept ? acceptMsg : declineMsg,
      journey_id: cs.course_id ?? null,
    });

    try {
      const { sendEmail } = await import("@/lib/email-sender.server");
      const { data: aide } = await supabaseAdmin
        .from("profiles")
        .select("email, first_name")
        .eq("id", cs.aide_id)
        .maybeSingle();
      if (aide?.email) {
        if (data.accept) {
          await sendEmail({
            to: aide.email,
            subject: `Reschedule accepted — "${cs.listing_title}"`,
            body: `Hi ${aide.first_name ?? "there"},

${learnerName} accepted your reschedule request for "${cs.listing_title}".

  New time: ${fmtWhen(pending.proposed_starts_at)} (${pending.proposed_duration_minutes} min)

Open your schedule:
https://fishtrippers.com/dashboard/upcoming-sessions

— FishTrippers`,
          }).catch((e) => console.error("[respond email aide accept]", e));
        } else {
          const chatLink = threadId
            ? `https://fishtrippers.com/dashboard/messages/${threadId}`
            : `https://fishtrippers.com/dashboard/messages`;
          await sendEmail({
            to: aide.email,
            subject: `Reschedule declined — "${cs.listing_title}"`,
            body: `Hi ${aide.first_name ?? "there"},

${learnerName} declined your reschedule request for "${cs.listing_title}".

Please message them directly to coordinate a new time:
${chatLink}

— FishTrippers`,
          }).catch((e) => console.error("[respond email aide decline]", e));
        }
      }

      // Confirmation email to learner with .ics on acceptance.
      if (data.accept) {
        if (learnerProfile.data?.email) {
          const endIso = new Date(
            new Date(pending.proposed_starts_at).getTime() +
              pending.proposed_duration_minutes * 60_000,
          ).toISOString();
          const ics = buildIcs({
            uid: `${cs.id}-${data.slot_index}-reschedule`,
            title: cs.listing_title,
            startIso: pending.proposed_starts_at,
            endIso,
          });
          const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cs.listing_title)}&dates=${pending.proposed_starts_at.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}/${endIso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
          await sendEmail({
            to: learnerProfile.data.email,
            subject: `New time confirmed — "${cs.listing_title}"`,
            body: `Your session "${cs.listing_title}" is now scheduled for ${fmtWhen(pending.proposed_starts_at)} (${pending.proposed_duration_minutes} min).

Add to Google Calendar:
${gcal}

iCal / .ics:
data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}

— FishTrippers`,
          }).catch((e) => console.error("[respond email learner accept]", e));
        }
      }
    } catch (e) {
      console.error("[respondToReschedule email block]", e);
    }

    return { ok: true };
  });

const CancelRescheduleInput = z.object({
  class_session_id: z.string().uuid(),
  slot_index: z.number().int().min(0).max(50),
});

export const cancelReschedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CancelRescheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cs, error } = await supabase
      .from("class_sessions")
      .select("id, aide_id, session_dates_times_array")
      .eq("id", data.class_session_id)
      .maybeSingle();
    if (error || !cs) throw new Error("Session not found.");
    if (cs.aide_id !== userId) throw new Error("Not authorized.");

    const slots = ((cs.session_dates_times_array as unknown as SlotJson[]) ?? []).slice();
    if (data.slot_index < 0 || data.slot_index >= slots.length)
      throw new Error("Slot not found.");
    slots[data.slot_index] = {
      ...slots[data.slot_index],
      pending_reschedule: null,
    };
    const { error: uErr } = await supabase
      .from("class_sessions")
      .update({ session_dates_times_array: slots as unknown as never })
      .eq("id", data.class_session_id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

// ---------- Learner: list pending reschedule proposals ----------

export interface LearnerRescheduleProposal {
  classSessionId: string;
  slotIndex: number;
  listingTitle: string;
  originalStartIso: string;
  originalDurationMinutes: number;
  proposedStartIso: string;
  proposedDurationMinutes: number;
  requestedAt: string;
}

export const listMyRescheduleProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LearnerRescheduleProposal[]> => {
    const { supabase, userId } = context;

    // Class sessions the learner is part of (via booking or paid order).
    const { data: myBookings } = await supabase
      .from("bookings")
      .select("class_session_id")
      .eq("learner_id", userId)
      .neq("status", "declined");
    const { data: myOrders } = await supabase
      .from("orders")
      .select("journey_id")
      .eq("learner_id", userId);

    const bookedSessionIds = (myBookings ?? [])
      .map((b) => b.class_session_id)
      .filter(Boolean) as string[];
    const orderedJourneyIds = (myOrders ?? [])
      .map((o) => o.journey_id)
      .filter(Boolean) as string[];

    if (bookedSessionIds.length === 0 && orderedJourneyIds.length === 0) return [];

    const orFilter: string[] = [];
    if (bookedSessionIds.length > 0)
      orFilter.push(`id.in.(${bookedSessionIds.join(",")})`);
    if (orderedJourneyIds.length > 0)
      orFilter.push(`course_id.in.(${orderedJourneyIds.join(",")})`);

    const { data: sessions } = await supabase
      .from("class_sessions")
      .select("id, listing_title, session_dates_times_array")
      .or(orFilter.join(","));

    const out: LearnerRescheduleProposal[] = [];
    for (const cs of sessions ?? []) {
      const slots = (cs.session_dates_times_array as unknown as SlotJson[] | null) ?? [];
      slots.forEach((slot, idx) => {
        if (!slot.pending_reschedule) return;
        out.push({
          classSessionId: cs.id,
          slotIndex: idx,
          listingTitle: cs.listing_title,
          originalStartIso: slot.starts_at,
          originalDurationMinutes: slot.duration_minutes ?? 45,
          proposedStartIso: slot.pending_reschedule.proposed_starts_at,
          proposedDurationMinutes:
            slot.pending_reschedule.proposed_duration_minutes,
          requestedAt: slot.pending_reschedule.requested_at,
        });
      });
    }
    return out;
  });
