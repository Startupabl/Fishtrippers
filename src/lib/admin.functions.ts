// Server functions for the admin dashboard. All gate on has_role(uid,'admin').
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createStripeLoginLink } from "@/lib/stripe.server";
import { renderEmailTemplate } from "@/lib/email-templates.server";
import { renderAlertTemplate } from "@/lib/alert-templates.server";
import { sendEmail } from "@/lib/email-sender.server";


async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

async function assertTargetNotAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (data) throw new Error("Admin accounts cannot be modified by other admins.");
}

function startOf(period: "day" | "week" | "month"): string {
  const now = new Date();
  if (period === "day") {
    now.setUTCHours(0, 0, 0, 0);
  } else if (period === "week") {
    now.setUTCDate(now.getUTCDate() - 7);
  } else {
    now.setUTCDate(now.getUTCDate() - 30);
  }
  return now.toISOString();
}

async function countSince(
  table: "profiles" | "journeys" | "bookings" | "operators",
  column: "created_at",
  iso: string,
  extra?: (q: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>,
): Promise<number> {
  const { count } = await supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, iso);
  return count ?? 0;
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const day = startOf("day");
    const week = startOf("week");
    const month = startOf("month");

    // Registrations
    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const [usersToday, usersWeek, usersMonth] = await Promise.all([
      countSince("profiles", "created_at", day),
      countSince("profiles", "created_at", week),
      countSince("profiles", "created_at", month),
    ]);

    // Auth provider breakdown via admin API
    let providerEmail = 0,
      providerGoogle = 0,
      providerOther = 0;
    try {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of usersList?.users ?? []) {
        const provider = (u.app_metadata as { provider?: string })?.provider ?? "email";
        if (provider === "google") providerGoogle++;
        else if (provider === "email") providerEmail++;
        else providerOther++;
      }
    } catch (e) {
      console.error("[admin] listUsers", e);
    }

    // Listings (only approved+published count as "active") — operator listings
    const { count: totalListings } = await supabaseAdmin
      .from("operators")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .eq("moderation_status", "approved");

    const [listingsToday, listingsWeek, listingsMonth] = await Promise.all([
      countSince("operators", "created_at", day),
      countSince("operators", "created_at", week),
      countSince("operators", "created_at", month),
    ]);

    // Revenue — sum of bookings.total_price where status indicates paid
    async function revenueSince(iso?: string): Promise<number> {
      let q = supabaseAdmin
        .from("bookings")
        .select("total_price, status, created_at")
        .in("status", ["confirmed"]);
      if (iso) q = q.gte("created_at", iso);
      const { data } = await q;
      return (data ?? []).reduce((sum, r: { total_price: number | null }) => sum + (r.total_price ?? 0), 0);
    }
    const [revTotal, revDay, revWeek, revMonth] = await Promise.all([
      revenueSince(),
      revenueSince(day),
      revenueSince(week),
      revenueSince(month),
    ]);

    // Action queue
    const [
      { count: pendingListings },
      { count: pendingTickets },
      { count: openFlags },
      { count: pendingCancellationDisputes },
    ] = await Promise.all([
      supabaseAdmin
        .from("operators")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "pending")
        .neq("status", "archived"),
      supabaseAdmin
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabaseAdmin
        .from("reported_listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabaseAdmin
        .from("cancellation_disputes")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
    const pendingInquiries = pendingTickets ?? 0;


    return {
      registrations: {
        total: totalUsers ?? 0,
        day: usersToday,
        week: usersWeek,
        month: usersMonth,
        byProvider: { email: providerEmail, google: providerGoogle, other: providerOther },
      },
      listings: {
        total: totalListings ?? 0,
        day: listingsToday,
        week: listingsWeek,
        month: listingsMonth,
      },
      revenue: { total: revTotal, day: revDay, week: revWeek, month: revMonth },
      queue: {
        pendingListings: pendingListings ?? 0,
        pendingInquiries,
        openFlags: openFlags ?? 0,
        pendingCancellationDisputes: pendingCancellationDisputes ?? 0,
      },

    };
  });

export const listAdminJourneys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        moderation: z
          .enum(["pending", "approved", "declined", "all", "archived"])
          .default("all"),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("journeys")
      .select(
        "id, title, category, status, moderation_status, created_at, mentor_id, course_id_slug, slug, base_price_minor, currency, featured, priority_order, cover_image_url",
      )
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.moderation === "archived") {
      q = q.eq("status", "archived");
    } else {
      q = q.neq("status", "archived");
      if (data.moderation !== "all") q = q.eq("moderation_status", data.moderation);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Hydrate mentor emails + Stripe payout flags
    const mentorIds = Array.from(new Set((rows ?? []).map((r) => r.mentor_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, stripe_connect_id, is_payout_ready")
      .in("id", mentorIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (rows ?? []).map((r) => {
      const p = profileMap.get(r.mentor_id);
      return {
        ...r,
        mentor_email: p?.email ?? null,
        mentor_name:
          [p?.first_name, p?.last_name].filter(Boolean).join(" ") || null,
        mentor_stripe_connect_id: p?.stripe_connect_id ?? null,
        mentor_is_payout_ready: !!p?.is_payout_ready,
      };
    });
  });

export const setJourneyPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        priority: z.number().int().min(-1000).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("journeys")
      .update({ priority_order: data.priority })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true, priority: data.priority };
  });

export const setJourneyModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        moderation: z.enum(["pending", "approved", "declined"]),
        note: z.string().trim().min(1).max(2000).optional(),
        reasonKey: z.string().trim().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    // When approving, also publish the listing (and assign a slug if the row
    // never went through the publish flow). When declining, flip the listing
    // back to draft so the Aide can edit and resubmit, and store the reason.
    const updates: {
      moderation_status: "pending" | "approved" | "declined";
      status?: "published" | "draft";
      slug?: string;
      moderation_note?: string | null;
    } = { moderation_status: data.moderation };

    if (data.moderation === "declined") {
      updates.status = "draft";
      updates.moderation_note = data.note ?? null;
    } else {
      updates.moderation_note = null;
    }
    if (data.moderation === "approved") {
      const { data: cur } = await supabaseAdmin
        .from("journeys")
        .select("status, slug, title, mentor_id")
        .eq("id", data.journeyId)
        .single();
      if (cur) {
        // NOTE: Stripe-connected payout check temporarily disabled for design/testing.
        // Re-enable before launch by restoring the is_payout_ready guard below.
        // const { data: mentor } = await supabaseAdmin
        //   .from("profiles")
        //   .select("is_payout_ready")
        //   .eq("id", cur.mentor_id)
        //   .maybeSingle();
        // if (!mentor?.is_payout_ready) {
        //   throw new Error("Cannot approve — Aide has not connected a payout account.");
        // }
        if (cur.status !== "published") updates.status = "published";
        if (!cur.slug) {
          const base =
            (cur.title ?? "journey")
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 60) || "journey";
          updates.slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
        }
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("journeys")
      .update(updates)
      .eq("id", data.journeyId)
      .select("mentor_id, title, slug, category")
      .single();
    if (error) throw new Error(error.message);

    if (data.moderation === "approved" && row) {
      await supabaseAdmin.from("user_alerts").insert({
        user_id: row.mentor_id,
        kind: "listing_live",
        journey_id: data.journeyId,
        message: `"${row.title}" is now live!`,
      });

      // Send "Listing Approved" transactional email via Resend.
      try {
        const { data: mentorProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, first_name")
          .eq("id", row.mentor_id)
          .maybeSingle();

        if (!mentorProfile?.email) {
          console.warn("[listing_approved email] skipped — no email on mentor profile", {
            journeyId: data.journeyId,
            mentorId: row.mentor_id,
          });
        } else {
          const appUrl = process.env.APP_URL ?? "https://fishtrippers.com";
          const listingUrl =
            row.slug && row.category
              ? `${appUrl}/c/${row.category}/${row.slug}`
              : appUrl;

          const rendered = await renderEmailTemplate("listing_approved", {
            aide_first_name: mentorProfile.first_name ?? "there",
            course_title: row.title ?? "your listing",
            listing_url: listingUrl,
          });

          console.log("[listing_approved email] sending", {
            to: mentorProfile.email,
            journeyId: data.journeyId,
          });
          const result = await sendEmail({
            to: mentorProfile.email,
            subject: rendered.subject,
            body: rendered.body,
          });
          console.log("[listing_approved email] sent", {
            id: result.id,
            to: mentorProfile.email,
          });
        }
      } catch (e) {
        // Common causes: missing RESEND_API_KEY, unverified sender domain,
        // Resend sandbox restriction (only verified addresses allowed).
        console.error("[listing_approved email] failed", {
          journeyId: data.journeyId,
          message: e instanceof Error ? e.message : String(e),
          error: e,
        });
      }
    } else if (data.moderation === "declined" && row) {
      const reviewNotes = data.note ?? "";
      const listingTitle = row.title ?? "your listing";

      // Onsite alert via seeded alert template
      try {
        const alertMessage = await renderAlertTemplate("listing_rejected_alert", {
          listing_title: listingTitle,
        });
        await supabaseAdmin.from("user_alerts").insert({
          user_id: row.mentor_id,
          kind: "listing_declined",
          journey_id: data.journeyId,
          message: alertMessage,
        });
      } catch (e) {
        console.error("[listing_rejected alert] failed", e);
      }

      // Email via seeded email template
      try {
        const { data: mentorProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, first_name")
          .eq("id", row.mentor_id)
          .maybeSingle();

        if (mentorProfile?.email) {
          const appUrl = process.env.APP_URL ?? "https://fishtrippers.com";
          const editUrl = `${appUrl}/create-listing/new?draftId=${data.journeyId}`;
          const rendered = await renderEmailTemplate("listing_rejected_notification", {
            user_name: mentorProfile.first_name ?? "there",
            listing_title: listingTitle,
            review_notes: reviewNotes,
            edit_url: editUrl,
          });
          await sendEmail({
            to: mentorProfile.email,
            subject: rendered.subject,
            body: rendered.body,
          });
        }
      } catch (e) {
        console.error("[listing_rejected email] failed", {
          journeyId: data.journeyId,
          reasonKey: data.reasonKey,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { ok: true };
  });


export const setJourneyFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid(), featured: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("journeys")
      .update({ featured: data.featured })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("journeys")
      .update({ status: "archived" })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("journeys")
      .update({ status: "draft", moderation_status: "pending" })
      .eq("id", data.journeyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const hardDeleteJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("journeys")
      .delete()
      .eq("id", data.journeyId);
    if (error) {
      // Foreign key violation (e.g. orders still reference this journey).
      if (
        error.code === "23503" ||
        /foreign key|violates/i.test(error.message)
      ) {
        throw new Error(
          "Cannot permanently delete — this listing has order history. Leave it archived.",
        );
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

// Backwards-compatible alias: existing callers that use deleteJourney now archive.
export const deleteJourney = archiveJourney;


export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, display_name, created_at, user_status, last_ip, last_ip_at, stripe_connect_id, user_number_id",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    const ids = (profiles ?? []).map((p) => p.id);
    const [{ data: roles }, { data: journeysList }, { data: operatorsList }, { data: bookingsList }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("journeys").select("mentor_id").in("mentor_id", ids),
      supabaseAdmin
        .from("operators")
        .select("owner_id, status")
        .in("owner_id", ids)
        .in("status", ["draft", "published"]),
      supabaseAdmin.from("bookings").select("learner_id").in("learner_id", ids),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    const listingsCount = new Map<string, number>();
    for (const j of journeysList ?? []) {
      listingsCount.set(j.mentor_id, (listingsCount.get(j.mentor_id) ?? 0) + 1);
    }
    for (const o of operatorsList ?? []) {
      listingsCount.set((o as any).owner_id, (listingsCount.get((o as any).owner_id) ?? 0) + 1);
    }
    const bookingsCount = new Map<string, number>();
    for (const b of bookingsList ?? []) {
      bookingsCount.set(b.learner_id, (bookingsCount.get(b.learner_id) ?? 0) + 1);
    }
    return (profiles ?? []).map((p) => {
      const lc = listingsCount.get(p.id) ?? 0;
      const payout_status: "connected" | "pending" | "none" = p.stripe_connect_id
        ? "connected"
        : lc > 0
        ? "pending"
        : "none";
      const composed = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const full_name = composed || p.email || "—";
      const full_name_is_fallback = !composed;
      return {
        ...p,
        roles: roleMap.get(p.id) ?? [],
        listings_count: lc,
        bookings_count: bookingsCount.get(p.id) ?? 0,
        payout_status,
        full_name,
        full_name_is_fallback,
      };
    });
  });

export const confirmUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await assertTargetNotAdmin(data.userId);
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { email_confirm: true },
    );
    if (authErr) throw new Error(authErr.message);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ user_status: "verified" })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const blockUserIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await assertTargetNotAdmin(data.userId);
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("last_ip")
      .eq("id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const ip = profile?.last_ip;
    if (!ip) throw new Error("No IP recorded for this user yet.");

    const { error: insErr } = await supabaseAdmin
      .from("blocked_ips")
      .insert({ ip, blocked_by: context.userId, reason: "admin block" });
    if (insErr && !insErr.message.includes("duplicate")) throw new Error(insErr.message);

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ user_status: "blocked" })
      .eq("id", data.userId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, ip };
  });

export const deleteOrArchiveUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await assertTargetNotAdmin(data.userId);



    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("user_status")
      .eq("id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("User not found");

    const [{ count: activeListings }, { count: learnerBookings }, { count: aideBookings }] =
      await Promise.all([
        supabaseAdmin
          .from("journeys")
          .select("id", { count: "exact", head: true })
          .eq("mentor_id", data.userId)
          .eq("status", "published"),
        supabaseAdmin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("learner_id", data.userId)
          .in("status", ["confirmed", "pending_offer"]),
        supabaseAdmin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("aide_id", data.userId)
          .in("status", ["confirmed", "pending_offer"]),
      ]);

    const activeBookings = (learnerBookings ?? 0) + (aideBookings ?? 0);
    const isUnverified = profile.user_status === "unverified";
    const canHardDelete = isUnverified || ((activeListings ?? 0) === 0 && activeBookings === 0);

    if (canHardDelete) {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
      if (delErr) throw new Error(delErr.message);
      return { ok: true, mode: "deleted" as const };
    }

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ user_status: "archived" })
      .eq("id", data.userId);
    if (upErr) throw new Error(upErr.message);

    const { error: jErr } = await supabaseAdmin
      .from("journeys")
      .update({ status: "draft" })
      .eq("mentor_id", data.userId)
      .eq("status", "published");
    if (jErr) throw new Error(jErr.message);

    return { ok: true, mode: "archived" as const };
  });

export const getAdminUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, display_name, phone_number, address_line1, address_line2, city, state_province, postal_code, country, timezone, avatar_url, user_status, last_ip, last_ip_at, created_at, login_count, stripe_customer_id, stripe_connect_id",
      )
      .eq("id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("User not found");

    let authInfo: {
      email_confirmed_at: string | null;
      last_sign_in_at: string | null;
      created_at: string | null;
      provider: string | null;
    } = { email_confirmed_at: null, last_sign_in_at: null, created_at: null, provider: null };
    try {
      const { data: au } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      const u = au?.user;
      if (u) {
        authInfo = {
          email_confirmed_at: u.email_confirmed_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          created_at: u.created_at ?? null,
          provider: (u.app_metadata as { provider?: string })?.provider ?? null,
        };
      }
    } catch (e) {
      console.error("[admin] getUserById", e);
    }

    const [{ data: roles }, { data: ipRows }, { data: journeys }, { data: operatorRows }, { data: bookings }] =
      await Promise.all([
        supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
        supabaseAdmin
          .from("ip_history")
          .select("id, ip, seen_at, user_agent")
          .eq("user_id", data.userId)
          .order("seen_at", { ascending: false })
          .limit(5),
        supabaseAdmin
          .from("journeys")
          .select("id, title, slug, status, moderation_status, base_price_minor, currency, created_at")
          .eq("mentor_id", data.userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("operators")
          .select("id, display_name, slug, status, moderation_status, created_at, primary_category, listing_number")
          .eq("owner_id", data.userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("bookings")
          .select("id, status, total_price, currency, created_at, course_id")
          .eq("learner_id", data.userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const operatorListings = (operatorRows ?? []).map((o: any) => ({
      id: o.id,
      title: o.display_name ?? "Untitled listing",
      slug: o.slug ?? null,
      status: o.status ?? "draft",
      moderation_status: o.moderation_status ?? "pending",
      base_price_minor: null as number | null,
      currency: "USD",
      created_at: o.created_at,
    }));

    const courseIds = Array.from(
      new Set((bookings ?? []).map((b) => b.course_id).filter(Boolean) as string[]),
    );
    let courseTitleMap = new Map<string, string>();
    if (courseIds.length) {
      const { data: courses } = await supabaseAdmin
        .from("journeys")
        .select("id, title")
        .in("id", courseIds);
      courseTitleMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
    }

    return {
      profile,
      auth: authInfo,
      roles: (roles ?? []).map((r) => r.role),
      ipHistory: ipRows ?? [],
      listings: [...operatorListings, ...(journeys ?? [])],
      bookings: (bookings ?? []).map((b) => ({
        ...b,
        course_title: b.course_id ? courseTitleMap.get(b.course_id) ?? null : null,
      })),
    };
  });

export const impersonateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        redirectTo: z
          .string()
          .url()
          .refine(
            (u) => {
              // SECURITY: only allow redirects back to our own app domains.
              // Without this allowlist, a magic-link with an attacker-controlled
              // redirectTo could exfiltrate the impersonated user's session token.
              const allowed = new Set(
                [
                  process.env.APP_URL ?? "https://fishtrippers.com",
                  "https://fishtrippers.com",
                  "https://www.fishtrippers.com",
                ].map((o) => {
                  try {
                    return new URL(o).origin;
                  } catch {
                    return o;
                  }
                }),
              );
              try {
                const url = new URL(u);
                if (allowed.has(url.origin)) return true;
                if (url.protocol === "https:" && url.hostname.endsWith(".lovable.app")) return true;
                return false;
              } catch {
                return false;
              }
            },
            { message: "redirectTo must be on the app domain" },
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = u?.user?.email;
    if (!email) throw new Error("User has no email");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: data.redirectTo ? { redirectTo: data.redirectTo } : undefined,
    });
    if (error) throw new Error(error.message);
    return { actionLink: link?.properties?.action_link ?? null };
  });

export const listAdminFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: flags } = await supabaseAdmin
      .from("journey_portfolio_flags")
      .select("id, journey_id, asset_id, reason, reporter_id, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const journeyIds = Array.from(new Set((flags ?? []).map((f) => f.journey_id)));
    const { data: journeys } = await supabaseAdmin
      .from("journeys")
      .select("id, title, slug")
      .in("id", journeyIds);
    const jMap = new Map((journeys ?? []).map((j) => [j.id, j]));
    return (flags ?? []).map((f) => ({
      ...f,
      journey_title: jMap.get(f.journey_id)?.title ?? "Unknown",
      journey_slug: jMap.get(f.journey_id)?.slug ?? null,
    }));
  });

export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resolveFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ flagId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("journey_portfolio_flags")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", data.flagId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateStripeDashboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const accountId = profile?.stripe_connect_id;
    if (!accountId) throw new Error("This user has no Stripe Connect account.");
    const link = await createStripeLoginLink(accountId);
    return { url: link.url };
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("You cannot change your own admin role.");
    }
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true, isAdmin: data.grant };
  });

// ---------------- Transactions ledger ----------------

export interface AdminTransactionRow {
  id: string;
  order_number: string | null;
  created_at: string;
  total_paid_minor: number;
  platform_fee_minor: number;
  aide_payout_minor: number;
  currency: string;
  learner_name: string;
  aide_name: string;
}

function displayName(p: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | undefined | null): string {
  if (!p) return "Unknown";
  if (p.display_name && p.display_name.trim()) return p.display_name.trim();
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || p.email?.split("@")[0] || "Unknown";
}

export const listAdminTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTransactionRow[]> => {
    await assertAdmin(context.userId);

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, created_at, total_paid_minor, platform_fee_minor, aide_payout_minor, currency, snapshot_currency, learner_id, mentor_id",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = orders ?? [];
    if (rows.length === 0) return [];

    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.learner_id, r.mentor_id]).filter(Boolean) as string[]),
    );
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name, email")
      .in("id", ids);
    const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

    return rows.map((r: any) => ({
      id: r.id,
      order_number: r.order_number,
      created_at: r.created_at,
      total_paid_minor: r.total_paid_minor ?? 0,
      platform_fee_minor: r.platform_fee_minor ?? 0,
      aide_payout_minor: r.aide_payout_minor ?? 0,
      currency: r.snapshot_currency ?? r.currency ?? "USD",
      learner_name: displayName(byId.get(r.learner_id)),
      aide_name: displayName(byId.get(r.mentor_id)),
    }));
  });

/* -------------------- Listing Reports (community flags) -------------------- */

const REPORT_REASON_VALUES = [
  "inappropriate",
  "scam",
  "external_payment",
  "copyright",
  "other",
] as const;

export const submitListingReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        reasonCategory: z.enum(REPORT_REASON_VALUES),
        customDetails: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Try to capture reporter_id if a session header is attached. Anonymous reports
    // are also allowed (reporter_id null). We use the admin client to bypass RLS
    // for the insert path (RLS already allows anon insert, but admin keeps a single path).
    let reporterId: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth = getRequestHeader("Authorization");
      if (auth?.startsWith("Bearer ")) {
        const { data: userData } = await supabaseAdmin.auth.getUser(auth.slice(7));
        reporterId = userData?.user?.id ?? null;
      }
    } catch {
      reporterId = null;
    }

    const { error } = await supabaseAdmin.from("reported_listings").insert({
      listing_id: data.listingId,
      reporter_id: reporterId,
      reason_category: data.reasonCategory,
      custom_details: data.customDetails ?? null,
      status: "pending_review",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReportedListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ scope: z.enum(["queue", "completed"]).default("queue") })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("reported_listings")
      .select("id, listing_id, reporter_id, reason_category, custom_details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.scope === "queue") {
      q = q.eq("status", "pending_review");
    } else {
      q = q.neq("status", "pending_review");
    }
    const { data: reports, error } = await q;
    if (error) throw new Error(error.message);


    const ids = Array.from(new Set((reports ?? []).map((r) => r.listing_id)));
    if (ids.length === 0) return [];

    const { data: journeys } = await supabaseAdmin
      .from("journeys")
      .select("id, title, slug, mentor_id, category")
      .in("id", ids);
    const jMap = new Map((journeys ?? []).map((j) => [j.id, j]));

    const mentorIds = Array.from(
      new Set((journeys ?? []).map((j) => j.mentor_id).filter(Boolean)),
    );
    const { data: mentors } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", mentorIds);
    const mMap = new Map((mentors ?? []).map((m) => [m.id, m]));

    return (reports ?? []).map((r) => {
      const j = jMap.get(r.listing_id);
      const m = j ? mMap.get(j.mentor_id) : undefined;
      const mentorName = m
        ? [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "Unknown"
        : "Unknown";
      return {
        id: r.id,
        listing_id: r.listing_id,
        reason_category: r.reason_category,
        custom_details: r.custom_details,
        created_at: r.created_at,
        status: r.status as string,
        journey_title: j?.title ?? "Unknown",
        journey_slug: j?.slug ?? null,
        journey_category: j?.category ?? null,
        mentor_id: j?.mentor_id ?? null,
        mentor_name: mentorName,
        mentor_email: m?.email ?? null,
      };

    });
  });

export const dismissListingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reportId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("reported_listings")
      .update({
        status: "resolved_dismissed",
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendReportedListingToDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        journeyId: z.string().uuid(),
        note: z.string().trim().min(1).max(2000),
        reasonKey: z.string().trim().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const { data: row, error } = await supabaseAdmin
      .from("journeys")
      .update({
        status: "draft",
        moderation_status: "declined",
        moderation_note: data.note,
      })
      .eq("id", data.journeyId)
      .select("mentor_id, title")
      .single();
    if (error) throw new Error(error.message);

    // Onsite alert + email (reuse listing_rejected templates)
    if (row) {
      const listingTitle = row.title ?? "your listing";
      try {
        const alertMessage = await renderAlertTemplate("listing_rejected_alert", {
          listing_title: listingTitle,
        });
        await supabaseAdmin.from("user_alerts").insert({
          user_id: row.mentor_id,
          kind: "listing_declined",
          journey_id: data.journeyId,
          message: alertMessage,
        });
      } catch (e) {
        console.error("[report->draft alert] failed", e);
      }
      try {
        const { data: mentorProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, first_name")
          .eq("id", row.mentor_id)
          .maybeSingle();
        if (mentorProfile?.email) {
          const appUrl = process.env.APP_URL ?? "https://fishtrippers.com";
          const editUrl = `${appUrl}/create-listing/new?draftId=${data.journeyId}`;
          const rendered = await renderEmailTemplate("listing_rejected_notification", {
            user_name: mentorProfile.first_name ?? "there",
            listing_title: listingTitle,
            review_notes: data.note,
            edit_url: editUrl,
          });
          await sendEmail({
            to: mentorProfile.email,
            subject: rendered.subject,
            body: rendered.body,
          });
        }
      } catch (e) {
        console.error("[report->draft email] failed", e);
      }
    }

    await supabaseAdmin
      .from("reported_listings")
      .update({
        status: "resolved_action_taken",
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.reportId);

    return { ok: true };
  });

export const suspendAndFreezeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        journeyId: z.string().uuid(),
        ownerId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    await assertTargetNotAdmin(data.ownerId);

    // 1) Archive listing
    await supabaseAdmin
      .from("journeys")
      .update({ status: "archived" })
      .eq("id", data.journeyId);

    // 2) Block the user account
    await supabaseAdmin
      .from("profiles")
      .update({ user_status: "blocked" })
      .eq("id", data.ownerId);

    // 3) Look up most recent IP and add it to the IP block list
    let ipToBlock: string | null = null;
    const { data: lastIp } = await supabaseAdmin
      .from("ip_history")
      .select("ip")
      .eq("user_id", data.ownerId)
      .order("seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    ipToBlock = lastIp?.ip ?? null;
    if (!ipToBlock) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("last_ip")
        .eq("id", data.ownerId)
        .maybeSingle();
      ipToBlock = profile?.last_ip ?? null;
    }
    if (ipToBlock) {
      // Unique index on ip ensures no duplicates; ignore conflict.
      await supabaseAdmin
        .from("blocked_ips")
        .upsert(
          {
            ip: ipToBlock,
            blocked_by: context.userId,
            reason: `Auto-block from flagged content #${data.reportId}`,
          },
          { onConflict: "ip", ignoreDuplicates: true },
        );
    }

    // 4) System alert to the user
    try {
      await supabaseAdmin.from("user_alerts").insert({
        user_id: data.ownerId,
        kind: "listing_declined",
        journey_id: data.journeyId,
        message:
          "Your account has been suspended due to a community safety violation. Please contact support if you believe this was a mistake.",
      });
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("email, first_name")
        .eq("id", data.ownerId)
        .maybeSingle();
      if (ownerProfile?.email) {
        await sendEmail({
          to: ownerProfile.email,
          subject: "Your account has been suspended",
          body: `Hi ${ownerProfile.first_name ?? "there"},\n\nYour account has been suspended following a review of reported content on our platform. If you believe this was a mistake, please reply to this email to contact our support team.\n\n— Trust & Safety`,
        });
      }
    } catch (e) {
      console.error("[suspend user] alert/email failed", e);
    }

    // 5) Mark report resolved
    await supabaseAdmin
      .from("reported_listings")
      .update({
        status: "resolved_suspended",
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.reportId);

    return { ok: true, ipBlocked: !!ipToBlock };
  });
