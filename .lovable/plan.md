## Make "Contact captain" actually send a message

Currently `CaptainCard.onClick` only fires `toast.info("Contact captain — available after approval")`. The messaging infrastructure exists (`message_threads`, `messages`, `sendMessage`), but it's journey-based — there's no path to start a thread with an operator directly. `message_threads.journey_id` is already nullable, so we can reuse the existing tables.

### 1. New server function — `src/lib/messages.functions.ts`

Add `ensureThreadWithOperator`:

- Input: `{ operator_id: uuid }` (zod)
- `requireSupabaseAuth` middleware
- Look up `operators.owner_id` for the operator (via `supabase`); 404 if missing
- Block messaging yourself (`owner_id === userId`)
- Look for existing thread where `learner_id=userId AND mentor_id=owner_id AND journey_id IS NULL` (use `.is("journey_id", null)`); reuse if found
- Otherwise insert a new `message_threads` row with `journey_id: null`
- Return `{ thread_id }`

No schema migration needed.

### 2. New component — `src/components/operator-listing/ContactCaptainDialog.tsx`

A small shadcn `Dialog` that:

- Props: `open`, `onOpenChange`, `operatorId`, `captainName`
- Renders a `<Textarea>` (min 10 / max 1000 chars) with placeholder `Hi {captainName}, I'm interested in your trips…`
- Submit button "Send message":
  - If no signed-in user → close dialog and `navigate({ to: "/auth", search: { redirect: window.location.pathname + window.location.hash } })`
  - Otherwise: call `ensureThreadWithOperator({ data: { operator_id } })`, then `sendMessage({ data: { thread_id, body } })`
  - On success: `toast.success("Message sent")`, close, `navigate({ to: "/dashboard/messages/$threadId", params: { threadId } })`
  - On error: `toast.error(err.message)`
- Uses `useServerFn` + `useMutation`; disabled state during pending

### 3. Wire `CaptainCard` — `src/components/operator-listing/CaptainCard.tsx`

- Add `operatorId: string` prop
- Replace the `toast.info` `onClick` with `setOpen(true)`
- Render `<ContactCaptainDialog open={open} onOpenChange={setOpen} operatorId={operatorId} captainName={name} />`

### 4. Pass `operatorId` to `CaptainCard`

- `src/routes/charters.$location.$businessSlug.tsx` line ~152 — add `operatorId={op.id}`
- `src/routes/_authenticated/operator.preview.tsx` line ~254 — pass the operator id from preview data (preview is owner-only viewing their own listing; the dialog will block self-messaging from the server, which is correct)

### Out of scope

- No email notification for new contact threads (existing system only emails on `is_urgent`)
- No changes to threads list UI; the new thread will appear there since it matches the `learner_id/mentor_id` query
- No verification gate — message goes through whether or not the operator is "verified"