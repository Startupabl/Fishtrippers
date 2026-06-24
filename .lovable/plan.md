## Goal

Remove the Daily.co video integration without breaking the surrounding booking, schedule, and class-session features that remain live. Per your decision, the `/classroom/$orderId` route is retired and Daily-related code is deleted.

## What gets removed

1. **`@daily-co/daily-js` package** — uninstall via `bun remove`. Lockfile / `package.json` updated.
2. **`src/components/classroom/DailyEmbed.tsx`** — delete.
3. **`src/lib/classroom.functions.ts`** — delete (server fn `getDailyJoinInfo`, Daily REST token minting, `DAILY_API_KEY` usage).
4. **`src/routes/_authenticated/classroom.$orderId.tsx`** — delete the route file; the TanStack Router plugin will regenerate `routeTree.gen.ts`.
5. **`DAILY_API_KEY` secret** — flag for removal from project secrets (no longer referenced).

## Where in-app links to the classroom get cleaned up

- **`src/routes/_authenticated/dashboard.learner.schedule.tsx`** — drop the `launchClassroom` function, the `onLaunch` prop on `ScheduleTable` / row components, and the "Launch" button (the inline `<Button onClick={onLaunch}>` at line ~433). Keep the rest of the schedule UI intact.
- **`src/components/orders/OrderSchedulePanel.tsx`** — remove the `onLaunch` prop, the `Rocket` import, and the "Launch" button block (lines ~171–179). The "Add to Google Calendar" button and the completion flow stay.
- **`src/components/checkout/AddToCalendarMenu.tsx`** — rewrite the calendar `details` text so it no longer points at `/classroom/<sessionId>`. New text: a neutral confirmation like "Your FishTrippers session — your host will share joining details before the trip." This is the only content change; the calendar export keeps working.
- **`src/lib/bookings.functions.ts`** — delete the stale comment at line ~350 that references `getDailyJoinInfo`.

## What stays untouched (intentionally)

- The `class_sessions` table, the `bookings.class_session_id` column, `increment_class_session_seats`, cohort booking, reschedule proposals, `startClassSession` / `endClassSession`, and every other server function that operates on class sessions. These power booking, schedule, and admin availability — none of them depend on Daily.
- The admin queue "Virtual Classroom Tech Issue" support topic and the contact form option — these are pre-existing support-ticket categories, not video infrastructure. Renaming or removing them is out of scope unless you ask.
- No database migrations. Nothing in `supabase/` changes.

## Verification

- Confirm the project typechecks after the deletions (no dangling imports of `DailyEmbed`, `getDailyJoinInfo`, or `@daily-co/daily-js`).
- Spot-check `/dashboard/learner/schedule` and the order schedule panel render with the Launch column gone and no console errors.
- Confirm `routeTree.gen.ts` no longer lists `/classroom/$orderId` after the route file is removed.