## Goal

1. After signup, every device lands on **/settings/profile** to finish account setup (not just desktop).
2. Account Settings page uses fishing-trip wording (no courses/lessons/aides/classes).
3. After Save, the two-choice page becomes **"I want to Fish"** → `/search` and **"I want to list my fishing trips"** → `/create-listing`.
4. Sweep the rest of the site so user-visible copy never says course / lesson / aide / mentor / learner / classroom / tutor anymore.

## 1. Signup → /settings/profile on every device

- `src/routes/register.tsx`: change `emailRedirectTo` from `/onboarding/choice` to `/settings/profile`. Update register meta description ("find your perfect AI Aide" → fishing wording).
- `src/components/auth/ProfileCompletionRedirector.tsx`: keep `/settings` allowed; `/onboarding/choice` will now only be reached AFTER profile save (see §3), so users on any viewport land in profile settings first.
- Sanity check `src/hooks/useAuthListener.ts` and `_authenticated.tsx` — no per-viewport branching; redirect is global.

## 2. /settings/profile — fishing copy + helper text

In `src/routes/_authenticated/settings.profile.tsx`:

- Welcome banner: "Welcome to FishTrippers! Let's finish setting up your account so your name, photo, and time zone are right before you book or list a fishing trip."
- Profile photo help: "This photo and your display name will be used when you send messages or list new trips."
- Display name help: "Shown publicly on your trip pages instead of your real name. Recommended: first name + last initial."
- Time zone help: "Used to show trip times in your local time."
- Phone help: "Used strictly for urgent trip reminders and scheduled updates. We will never spam you."
- "Lab Hours" section (conditional) → rename to "Trip Availability"; description: "Set when you're usually free. This shows on your trip listings and stays in sync with the 'Manage Availability' shortcut."
- Rename internal flag `showLabHours` (cosmetic), keep `getHasAideListings` import but treat as "has trip listings" (no DB rename in this pass).
- Save & Continue still routes first-time users to `/onboarding/choice` (now the new fishing two-choice screen).

## 3. /onboarding/choice — two new options

In `src/routes/onboarding.choice.tsx`:

- Heading stays "How would you like to start?".
- Card 1: **I want to Fish** — icon `Fish` (lucide). Subtext: "Browse fishing trips and book with a local guide." `Link to="/search"`. Drop the `localStorage` quiz flag (no longer needed).
- Card 2: **I want to list my fishing trips** — icon `Anchor` (lucide). Subtext: "Set up your guide profile and publish your first fishing trip." `Link to="/create-listing"`, still gated through `useProfileGuard`.
- Update meta title/description.

## 4. ProfileCompletionGuard dialog copy

`src/components/onboarding/ProfileCompletionGuard.tsx`:

- Guest dialog: "Create a free account (or log in) to message guides, check availability, and list your own fishing trips."
- Incomplete dialog: "Before you can list a trip or book one, we need a few details (name, location & timezone, and photo) so your trip schedules and messages sync correctly."

## 5. Site-wide user-facing copy sweep

Replace **visible UI text** across the project using this mapping:

| Old                          | New                                |
|------------------------------|------------------------------------|
| course / Course / courses    | fishing trip / Fishing Trip / trips |
| lesson / Lesson / lessons    | trip / Trip / trips                |
| aide / Aide / aides          | guide / Guide / guides             |
| mentor / Mentor / mentors    | guide / Guide / guides             |
| learner / Learner / learners | angler / Angler / anglers          |
| tutor / Tutor                | guide / Guide                      |
| classroom / Classroom        | trip room / Trip room              |
| curriculum                   | trip plan                          |
| class (when meaning lesson)  | trip                               |
| "AI course" / "AI mentor"    | "fishing trip" / "fishing guide"   |

Files to touch (top hits from a `\b(course|lesson|aide|mentor|learner|tutor|classroom|curriculum)\b` scan across `src/`, scoped to user-facing strings only):

- `src/routes/c.$categorySlug.$listingSlug.tsx`, `m.$mentorSlug.tsx`, `messages.$threadId.tsx`, `checkout.success.tsx`, `how-it-works-trippers.tsx`, `how-it-works-hosts.tsx`, `about.tsx`, `first-lesson-guide.tsx`, `learner-faqs.tsx`, `mentor-faqs.tsx`, `become-a-mentor.tsx`, `become-an-aide.tsx`, `journey-welcome.tsx`, `mentor.create-path.tsx`, `mentor-agreement.tsx`.
- `src/routes/_authenticated/dashboard.*.tsx`, `classroom.$orderId.tsx`, `my-learning.tsx`, `operator.preview.tsx`, settings pages.
- Components: `WorkspaceSidebar.tsx`, `ListingCard.tsx`, `EditListingDrawer.tsx`, all `src/components/mentor-express/*`, `src/components/onboarding/MissionMatchQuiz.tsx`, `src/components/checkout/*`, `src/components/contact/ContactSupportForm.tsx`, `src/components/dashboard/*`, `src/components/layout/UserAvatarMenu.tsx`.
- Static content: `src/lib/content.ts`, `src/lib/alert-templates.defaults.ts`, `src/data/lesson-paths.ts`, `src/lib/category-placeholders.ts`.

Approach: open each file, change ONLY string literals / JSX text / `meta` titles & descriptions / `placeholder` / `aria-label` / toast/error messages. Leave untouched: filenames, route paths, query keys, DB column names, table names, generated types, `routeTree.gen.ts`, store names, function names, TypeScript types, env keys, slugs, analytics events.

## 6. Out of scope (explicit)

To keep this safe and shippable in one pass, the plan does NOT:

- Rename route files / URLs (e.g. `/become-an-aide`, `/m/$mentorSlug`, `/onboarding/learner.*`) — that would break inbound links, sitemap, and existing data.
- Rename database tables/columns (`journeys`, `mentor_id`, `learner_id`, `is_profile_complete`, etc.).
- Touch `src/integrations/supabase/types.ts` or `src/routeTree.gen.ts` (auto-generated).
- Change identifier-level names of functions/hooks/components (`getHasAideListings`, `useLearnerPrefsStore`, `MentorIntroForm`, etc.). Only their displayed strings change.

If you want a follow-up pass to also rename the file/route/DB layer for SEO consistency (e.g. `/m/...` → `/g/...`, `/become-an-aide` → `/become-a-guide`), that's a separate migration with redirects and DB changes.

## 7. Verification

- After build, on mobile viewport: register a new account → confirm email → land on `/settings/profile` with fishing-themed banner.
- Save & Continue → land on `/onboarding/choice` showing the two new fishing cards; each routes correctly.
- Spot-check `/`, `/search`, `/how-it-works-trippers`, `/how-it-works-hosts`, a listing page, the dashboard sidebar, and the avatar menu for any remaining "course / lesson / aide / mentor / learner" wording.
