## Rename "Fishing Technique" → "Fishing Style"

Pure copy change. Internal field names (`techniques`, `FISHING_TECHNIQUES`, DB column `trip_packages.techniques`) stay as-is to avoid a risky refactor — only user-visible labels change.

### Files to edit

1. **`src/routes/search.tsx`** (line 187)
   - Filter pill label: `"Fishing Technique"` → `"Fishing Style"`

2. **`src/components/operator-onboarding/trips/TripFormDialog.tsx`**
   - Line 365: `<Label>Fishing techniques</Label>` → `<Label>Fishing Style</Label>`
   - Line 160: validation error `"Pick at least one technique"` → `"Pick at least one fishing style"`

3. **`src/lib/trips.shared.ts`** (line 70)
   - Zod message `"Pick at least one technique"` → `"Pick at least one fishing style"`

### Out of scope
- DB columns, TypeScript types, variable names, and the `FISHING_TECHNIQUES` constant stay unchanged.
- The hero search bar and homepage don't currently surface this label; nothing else to update.
