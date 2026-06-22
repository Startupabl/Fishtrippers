## Fix: Report Issue Availability on Cancelled Trips

### Problem
The "Report Issue" button on a captain's cancelled trip only appears **during the 48-hour window *after* the scheduled departure**. For a trip cancelled 8 days early, the button is invisible until the departure date — which is confusing for captains trying to file a claim right away.

### Goal
Make the button available **from the moment of cancellation** and keep it visible **until 48 hours after the scheduled departure**.

### Technical Details

Change the time-gate logic in `src/routes/_authenticated/dashboard.upcoming-sessions.tsx` (around line 176-186).

Current logic:
```ts
reportWindowOpen = now >= startMs && now <= startMs + 48 * 60 * 60 * 1000;
```

New logic:
```ts
reportWindowOpen = now <= startMs + 48 * 60 * 60 * 1000;
```

The `now >= startMs` check is removed. For a cancelled trip, the button is visible immediately and disappears only when the 48-hour post-departure window closes.

### Verification
- The cancelled trip (Order ORD-XXXXXX, June 30 departure) should immediately show a red **"Report Issue"** button on the captain's My Schedule page.
- The button remains visible until ~July 2, 48 hours after departure.
- Other non-cancelled trips are unaffected.