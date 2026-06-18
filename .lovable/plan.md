## Update ShareDialog message and use city/region instead of full address

**Changes:**

1. **`src/components/operator-listing/ShareDialog.tsx`**
   - Update the prefilled message from:
     `I just found this {title} in {location} on FishTrippers. Check it out!`
     to:
     `I just found amazing trips organized by {title} in {location} on FishTrippers. Check it out!`
   - No prop shape change; `location` is still a single string — the caller now passes a clean "City, ST, Country" instead of the full street address.

2. **`src/routes/charters.$location.$businessSlug.tsx`**
   - Build a new `shareLocation` from `op.default_departure_city`, `op.default_departure_state`, and `op.default_departure_country` (joined with `, `, skipping empty parts). Fallback chain: `shareLocation || op.location || ""`.
   - Pass it via a new optional `shareLocation` prop on `<HeaderGallery>`.

3. **`src/components/operator-listing/HeaderGallery.tsx`**
   - Accept the new `shareLocation?: string` prop.
   - Pass `location={shareLocation ?? location}` into `<ShareDialog>` so the on-page header keeps showing the full departure address, while the share message uses the cleaner city/region/country string (e.g. `Sunnyvale, CA, USA`).

No backend, schema, or other UI changes.