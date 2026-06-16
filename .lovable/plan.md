## Problem

Clicking the edit icon on **My Listing** routes to `/mentor/create-path`. The page hydrates from the server, sees `operator.submitted_at` is set, and flips `state.submitted = true` — which short-circuits the whole wizard and renders the `SubmittedScreen` "Submitted for review" blocker. The user can never reach the form to edit.

Earlier work intended to keep editing unlocked at every stage, but this client-side gate was missed.

## Fix

Remove the gate so the wizard always renders, regardless of moderation status. Keep `submitted` in the store (the post-submit Stripe dialog flow still reads it via `ReviewSubmitStep`), just don't use it to replace the entire page.

### Edit: `src/routes/mentor.create-path.tsx`

Delete the block (lines ~215–226):

```tsx
if (state.submitted) {
  return (
    <div className="min-h-screen bg-background">
      <header>…</header>
      <SubmittedScreen />
    </div>
  );
}
```

Also drop the now-unused `SubmittedScreen` import.

That's the entire change — the wizard then renders for draft, pending, approved, and rejected listings alike. The `ReviewSubmitStep` already handles re-submission and the Stripe-connect dialog on its own.

### Out of scope

- No backend / RLS / server-fn changes — `upsertOperatorDraft` already accepts writes at any moderation status.
- No change to `dashboard.my-listing.tsx`, admin tooling, or `SubmittedScreen.tsx` (left in place in case it's used elsewhere; safe to delete later if not).