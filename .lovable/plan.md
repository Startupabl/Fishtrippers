# Reconfigure Custom Offer → Custom Trip

Repurposes the existing Custom Offer pipeline (`CustomOfferComposer` → `createCustomOffer` → `CustomOfferCard` → checkout) for the new fishing-trip deposit flow. Keeps the cohort/class-session plumbing under the hood (it already drives accept → checkout → confirm), but the UI, validation, and calendar behavior are redone to match a single-date charter trip.

## 1. Chat header entry point

**File:** `src/routes/_authenticated/dashboard.messages.$threadId.tsx`

- Replace button label `Send Custom Offer` / mobile `Offer` with **Create Custom Trip** / mobile **Trip**.
- Keep the `Sparkles` icon and `variant="info"`. No layout changes.

## 2. New composer form (rewrite `CustomOfferComposer.tsx`)

Drop the cohort/new-vs-existing toggle and the per-session list. Single-trip layout with these fields, validated client-side:

| Field | Control | Rules |
|---|---|---|
| Trip Title | text input | required, 3–140 chars |
| Duration | `Select` 1 h → 14 h | required, stored as minutes (hours × 60) |
| Total Anglers | number input | required, 1–50 |
| Trip Date | shadcn date picker | required, must be ≥ today in guide TZ |
| Start Time | `<input type="time">` | required, HH:mm |
| Meeting Point | reuse `DeparturePointPicker` (Google Places autocomplete already wired) | required, stores address + lat/lng + place_id |
| Base Currency | `Select` from `currencyOptions` | defaults to operator `base_currency` (fallback profile default) |
| Total Price | numeric | required, > 0 |
| Deposit Amount | numeric | auto-suggest `round(total × 0.10)` on total change unless guide edited; manually editable; must be ≥ 1 and ≤ total |
| Offer Expiration | `Select` | `24 hours`, `3 days`, `7 days`, `Never` |

**Header:**
- Title: `Create a Custom Trip for {anglerFirstName} {anglerLastName}` (use existing `learnerName` fetch).
- Subtitle: `Use this form to send a tailored trip an angler can book immediately.`

**Footer:** `Cancel` (variant `ghost`) and `Send Custom Trip` (variant `info`) — both reuse global tokens.

**Time-zone disclaimer (above footer):**

```
⚠️ Trip times you enter are interpreted in your profile time zone
({friendlyTimezoneLabel(profileTz)} ({tzAbbrev(profileTz)})) and will be
shown to the angler in your local time zone.
```

Re-use existing helpers `friendlyTimezoneLabel`, `tzAbbrev`, `zonedWallTimeToUtcISO` from `src/lib/tz.ts`. The date+time is converted to UTC strictly via the guide's `profiles.timezone` regardless of browser locale (already the pattern used today). The existing "TZ missing" warning block stays.

## 3. Server function rewrite — `createCustomOffer`

**File:** `src/lib/bookings.functions.ts`

- Replace `CreateOfferInput` with the new schema (single slot, deposit, meeting point, total anglers, duration). Drop `mode`, `existing cohort`, multi-slot arrays.
- Keep creating a backing `class_sessions` row (so the existing `CustomOfferCard` accept → checkout flow keeps working) with:
  - `listing_title` = trip title
  - `max_seats` = total anglers
  - `session_dates_times_array` = `[{ starts_at: <utc iso>, duration_minutes }]`
  - `meeting_point_address/lat/lng/place_id` (add columns — see Migration below)
- Insert `bookings` row as today, plus:
  - `trip_date` = the local date in guide TZ (already a column, used by `sync_host_availability_from_booking`)
  - `total_price` = total price minor
  - `deposit_minor` (new column) = deposit minor
  - `service_fee_amount` / `aide_earnings` computed off the deposit, not the total (the deposit is what's actually charged at checkout — matches the new buyer-deposit model)
- Insert chat message with `attachment_type='custom_offer'`, `offer_expires_at`, `time_zone_label`, `author_timezone`.

## 4. Instant-book calendar hold + auto-release

**Migration** (`supabase--migration`):

1. `ALTER TABLE public.bookings ADD COLUMN deposit_minor integer;`
2. `ALTER TABLE public.class_sessions ADD COLUMN meeting_point_address text, ADD COLUMN meeting_point_lat double precision, ADD COLUMN meeting_point_lng double precision, ADD COLUMN meeting_point_place_id text;`
3. Extend `host_availability.status` to allow `'held'` (string column today; no enum change needed). Add partial unique guard so `(host_id, date)` upserts work.
4. Replace trigger `sync_host_availability_from_booking` so it also writes a `held` row when a booking is inserted with `status='pending_offer'` and a `trip_date`, and removes the held row if the booking flips to `declined` or `expired`.
5. Add SQL function `public.expire_pending_custom_offers()` that:
   - finds `bookings` with `status='pending_offer'`, `offer_expires_at < now()` (join through `messages` for the expiry), sets them to `declined`, and deletes the matching `held` `host_availability` row.
6. Schedule it via `pg_cron` every minute (uses existing `pg_cron` setup).

**Effect:** The chosen date is blocked on the operator's Instant-Book calendar the instant the offer is sent and freed automatically when the expiration elapses without payment. The webhook path that flips to `confirmed` already promotes the held row to `booked` via the trigger.

## 5. Chat card + notifications

- `CustomOfferCard` keeps rendering; update copy to show **Trip**, the meeting point, duration, total anglers, total price, and **Deposit due now** as the headline price. No other behavioural changes.
- After insert in `createCustomOffer`, write to `public.user_alerts` with `kind='custom_offer_received'` for `thread.learner_id` (`alert_templates` row already exists).
- Enqueue email via `supabase.rpc('enqueue_email', …)` with template `custom_offer_received` (already in `email-templates.defaults`). Payload: angler name, guide name, trip title, formatted date/time in angler TZ if known else guide TZ, deposit + total, accept link to `/dashboard/messages/{threadId}`.

## 6. Technical notes

- Profile time zone is the source of truth (operators table has no `timezone` column; existing composer already uses `profiles.timezone`). If we later add `operators.timezone`, only the resolver in the composer changes.
- Re-using `DeparturePointPicker` requires no extra Google Maps wiring — keys already configured.
- `class_sessions.max_seats` is reused as "total anglers"; cohort/seat math in checkout already enforces it.
- Existing emails/alerts kind (`custom_offer_received`) and accept-path are reused so the angler flow (deposit checkout) needs no further changes.

## Out of scope

- No changes to the angler's accept/checkout UI beyond label tweaks on the card.
- No new SMS channel.
- No operator-side calendar UI changes (the hold appears automatically because the calendar already reads `host_availability`).
