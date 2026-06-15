## Goal
Add a new "About" section to the operator onboarding **Profile** step, below Location. Conditional copy based on Step 1 (`charter` = Business, `guide` = Individual), tooltip with tips, 4–5 row textarea, 150 min / 1000 max characters. Persist as `operators.about` so progress survives.

## Changes

### 1. Database — new column
Migration adds `about text` (nullable) to `public.operators`. No new table, so no extra GRANTs needed (existing table grants apply).

```sql
ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS about text;
ALTER TABLE public.operators ADD CONSTRAINT operators_about_length_check
  CHECK (about IS NULL OR char_length(about) <= 1000);
```

### 2. Shared schema — `src/lib/operators.shared.ts`
- `operatorDraftSchema`: add `about: z.string().trim().max(1000).optional().nullable()`.
- `submitOperatorSchema`: add `about: z.string().trim().min(150).max(1000)`.

### 3. Onboarding store — `src/stores/useOperatorOnboardingStore.ts`
- Add `about: string` (default `""`).
- Extend `setProfile` to accept `about?`.
- `isProfileValid`: also require `about.trim().length >= 150 && <= 1000`.
- `reset` clears about. `hydrateFromServer` loads `operator.about ?? ""`.

### 4. Server functions — `src/lib/operators.functions.ts`
- `upsertOperatorDraft`: include `about: data.operator.about ?? null` in `operatorPayload`.
- `submitOperatorForReview`: include `about: data.about` in upsert.

### 5. Review step — `src/components/operator-onboarding/steps/ReviewSubmitStep.tsx`
- Pass `about: state.about.trim()` into the submit payload.
- Render the About text in the summary block beneath Location.

### 6. Profile step UI — `src/components/operator-onboarding/steps/ProfileStep.tsx`
Add an About section directly under the Location field. Order stays: Profile Image → Display Name → Location → About.

- Read `business_type` and `about` from the store; write via `setProfile({ about })`.
- Title (with `<Info>` icon trigger in a `TooltipProvider`/`Tooltip` from `@/components/ui/tooltip`):
  - `guide` → **"About You & Your Experience"**, placeholder *"I've been fishing these waters for over 20 years. I love helping families and beginners learn the ropes…"*
  - `charter` → **"About Our Charter Business"**, placeholder *"Our fleet has been serving the area for over a decade. We pride ourselves on safety, top-tier equipment, and our team of expert captains…"*
- Tooltip content (2–3 bullet tips):
  - `guide`: years of experience; teaching style / who you love taking out; signature technique or local knowledge.
  - `charter`: fleet size & equipment; safety credentials (USCG, first-aid); captain/crew expertise.
- Input: `<Textarea>` from `@/components/ui/textarea`, `rows={5}`, `maxLength={1000}`, `minLength={150}`.
- Helper row under the textarea:
  - Left: small hint "Minimum 150 characters — aim for 2–3 strong sentences."
  - Right: live counter `{about.length} / 1000` — turns `text-destructive` when `< 150` and user has typed something; `text-muted-foreground` otherwise.

Continue button stays disabled until `isProfileValid` passes (now includes the 150-char rule).

## Verification
- Type <150 chars → counter red, Continue disabled.
- Type ≥150 chars → counter neutral, Continue enabled.
- Switch business type in Step 1 → title and placeholder swap.
- Refresh mid-flow → about text reloads from DB via `hydrateFromServer`.
- Submit for review → `operators.about` populated; visible on Review step.
