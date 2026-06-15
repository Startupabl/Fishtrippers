# Add Profile Photo to Step 2 — with Cropper

## Goal
Make "Add your profile image" the first field in the operator onboarding profile step. Prefill from the user's existing account avatar, and reuse the exact same upload + crop/zoom experience as the account settings page.

## Approach
Single source of truth: `profiles.avatar_url` + `avatars` bucket. Editing the photo here updates the user's account avatar everywhere it's already shown (listings, search results, header).

Reuse the existing primitives — no new cropper code:
- `AvatarCropperDialog` from `@/components/settings/AvatarCropperDialog` (provides crop, zoom, rotate exactly like settings).
- `validateUpload` from `@/lib/image-crop` (file type/size guard).
- Same upload path pattern as `settings.profile.tsx` lines 241–276: validate → open cropper → upload cropped blob to `avatars/{user_id}/avatar.{ext}` with `upsert: true` → write `profiles.avatar_url`.

## UX in `ProfileStep.tsx`
New first block, above Display Name:

- Heading: **Add your profile image**
- Subtext: *This will be displayed on your listing and search results. A high-quality logo or a clear professional photo works best.*
- 96px round avatar preview — current `profiles.avatar_url` if set, otherwise initials fallback (first/last name from profile).
- Button: "Upload photo" / "Change photo" (label flips when one exists), shows "Uploading…" while saving.
- Clicking opens file picker → on file select, `AvatarCropperDialog` opens with the same crop + zoom controls used in settings.
- On confirm: upload, update profile, refresh preview, toast "Photo updated", invalidate the same `profile-completion` query key so the rest of the app picks it up.

Photo is **recommended, not required** for Continue (existing display_name + location validation unchanged). Say the word if you want it required.

## Files touched
- `src/components/operator-onboarding/steps/ProfileStep.tsx` — add the new block, file handler, cropper dialog, upload handler (mirrors `settings.profile.tsx` 241–276).
- `src/lib/operators.functions.ts` — add `getMyAvatar` server fn (returns `{ avatar_url, first_name, last_name }`) so the step seeds preview + initials on mount.

No DB migration, no new component, no changes to the onboarding store.

## Out of scope
- Separate business logo distinct from personal avatar.
- Hard requirement to proceed without a photo.
- Any changes to the cropper itself.
