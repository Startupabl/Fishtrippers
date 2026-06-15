# Remove video (Daily.co) integration

Since this project won't use video, strip out the Daily-powered live classroom flow end to end. Marketing copy and the underlying booking/cohort data stay intact — only the live-video room is removed.

## What gets removed

1. **Daily SDK + server function**
   - Delete `src/components/classroom/DailyEmbed.tsx` (and the empty `src/components/classroom/` folder).
   - Delete `src/lib/classroom.functions.ts` (the `getDailyJoinInfo` server fn + Daily meeting-token minting).
   - Delete the route `src/routes/_authenticated/classroom.$orderId.tsx`.
   - Uninstall the `@daily-co/daily-js` npm dependency.

2. **"Launch / Join classroom" UI**
   - `src/routes/_authenticated/dashboard.learner.purchases.tsx` — remove `launchClassroom` and the Launch button wiring; update the page description to drop "or launch the classroom."
   - `src/routes/_authenticated/dashboard.learner.schedule.tsx` — remove `launchClassroom` and any button that calls it.
   - `src/routes/_authenticated/dashboard.upcoming-sessions.tsx` — remove the navigate-to-classroom handler and the button that triggers it.
   - `src/components/orders/OrderSchedulePanel.tsx` — remove the "Launch" classroom button and its `onLaunch` prop; update call sites accordingly.
   - `src/components/checkout/AddToCalendarMenu.tsx` — remove the `/classroom/{sessionId}` URL from the calendar event description (replace with a neutral lesson description).

3. **Classroom-only server functions (no longer referenced)**
   - In `src/lib/bookings.functions.ts`, remove `startClassSession` and `endClassSession` (they only existed to flip `class_sessions.is_live` for the Daily room). The `class_sessions` table itself, cohort scheduling, bookings, and orders all stay.

4. **Secrets**
   - Delete `DAILY_API_KEY` and `DAILY_OWNER_TOKEN` from project secrets.
   - Leave `CRON_SECRET`, `RESEND_API_KEY`, and `TURNSTILE_SECRET_KEY` untouched — you'll update those when ready.

## What stays

- All booking / cohort / scheduling logic, `class_sessions` table, calendar export (minus the classroom URL), messaging, orders, payouts.
- Any UI text mentioning "daily" in an unrelated sense (e.g. "daily tasks", sitemap `changefreq: "daily"`) — those are not video-related.

## Verification

- After edits, the auto-generated `src/routeTree.gen.ts` will rebuild and the `/classroom/$orderId` route will be gone.
- Confirm the build passes and no remaining import points at the deleted files (`rg "classroom.functions|DailyEmbed|/classroom/"`).

## Out of scope

- Replacing the live-class experience with something else (Zoom links, async video, etc.) — say the word if you want a follow-up plan for that.
