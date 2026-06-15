## Problem
Sign-in submits with empty email/password → Supabase returns "missing email or phone". Cause is React state desync on the auth forms: a hydration mismatch (Google Tag Manager browser extension adds `data-gtm-form-interact-id` attrs to the form/inputs) leaves the controlled inputs in an inconsistent state, so `onChange` doesn't update `email` / `password` reliably and the submit handler sees `""`.

## Fix
Switch the login and register forms from controlled `useState` inputs to reading values from the submitted form via `FormData` on submit. This sidesteps hydration/autofill/extension interference entirely — submit always sees what's actually in the DOM at click time.

Files:
- `src/routes/login.tsx` — drop `email`/`password` state; read both from `new FormData(e.currentTarget)` in `onSubmit`; add `name="email"` / `name="password"` to the inputs; keep `defaultValue=""`.
- `src/routes/register.tsx` — same pattern for `firstName`, `email`, `password`.

## Verify
- Sign in with `cruz.collective.llc@gmail.com` → lands on `/` (admin).
- Create another test user via `/register` → still works.
