## Root cause

The "Create a Listing" wizard is backed by a Zustand store (`useOperatorOnboardingStore`) that **persists to `localStorage` under the key `operator-onboarding-draft-v2`**. When a different user signs in on the same browser, that cached draft is read straight into the form before the server hydrates, so the previous user's display name, about text, vessel, species, departure, etc. appear pre-populated.

The app already has a "purge on user switch" mechanism in `src/hooks/useAuthListener.ts` (`USER_SCOPED_STORAGE_KEYS` + `purgeUserScopedStorage`) — but `operator-onboarding-draft-v2` was never added to it when this wizard was built, so it is the one user-scoped draft that survives sign-out / account switch.

Server side is fine: `getMyOperator` and `upsertOperatorDraft` both go through `requireSupabaseAuth` and filter by `owner_id = userId`. RLS is not the leak.

## Fix

In `src/hooks/useAuthListener.ts`:

1. Add `"operator-onboarding-draft-v2"` to `USER_SCOPED_STORAGE_KEYS` so it is removed from `localStorage` whenever `reconcileUserScopedStorage` detects the signed-in user id has changed (including sign-out → new sign-in, and sign-in as a different account on the same browser).
2. In `purgeUserScopedStorage`, also reset the in-memory store via `useOperatorOnboardingStore.getState().reset()` (mirroring the existing `useMentorExpressStore` / `useMentorProfileStore` resets), so the leak is gone even before a page reload.

That's the only code change required to close the leak in the listing creation flow.

## Verification

- New user signs up → opens `/create-listing/new` → all fields empty, sidebar steps all "upcoming".
- Existing user with a draft signs out, second user signs in on same browser → second user sees an empty wizard, not the first user's data.
- Existing user with a real listing still sees their own data hydrated from the server (the `useQuery(["my-operator", authUser.id])` call is keyed by user id and runs after auth is ready, so server hydration still works).

## Out of scope (flagging, not changing)

- `cart-v1` (from `useCartStore`) is also persisted and not in the purge list. It's a learner cart, not part of this bug, but it has the same cross-account leak shape. Happy to fix in a follow-up if you want — say the word.
- No RLS changes needed; existing policies already scope operators/vessels/trips to `owner_id = auth.uid()`.
