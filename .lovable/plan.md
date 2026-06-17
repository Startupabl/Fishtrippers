# Departure & Meeting Point map on Listing page

Wire up the currently non-working "Show map" link next to the address by adding a real Google Map section to the listing detail page, anchored to `#map`.

## What you'll see

- Below the existing listing sections (after Policies, before footer) a new **Departure & Meeting Point** card with:
  - Heading + the saved meeting-point address (e.g. marina, ramp, tackle shop name).
  - An interactive Google Map (~360px tall, rounded, bordered) centered on the meeting point at zoom 15.
  - A clean pin marker on the exact location.
  - A small label/info window over the pin reading **"Trip Departure / Meeting Point"** (open by default; user can close and click the pin to reopen).
- The "Show map" link in the header smooth-scrolls to this new section.
- If the operator has no saved meeting point coordinates yet, the section shows a friendly placeholder ("Meeting point not set yet") instead of a broken map — never an empty grey box.

## Technical details

1. **New component** `src/components/operator-listing/MeetingPointMap.tsx`
   - Props: `address: string | null`, `lat: number | null`, `lng: number | null`.
   - Uses the existing Google Maps browser key (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) and tracking ID, loaded via the standard async `<script>` injection pattern with a global `initMeetingPointMap` callback (singleton loader so multiple instances don't re-inject).
   - Renders `google.maps.Map` (no `mapId`) at zoom 15, disables `mapTypeControl` and `streetViewControl` for a clean look, keeps zoom + fullscreen.
   - Adds a `google.maps.Marker` at `{lat, lng}` plus a `google.maps.InfoWindow` with the text **"Trip Departure / Meeting Point"** opened on mount; clicking the marker re-opens it.
   - Renders a header row above the map: section title + the address text.
   - When `lat`/`lng` missing: render the placeholder card (no script load).

2. **Wire into the listing page** `src/routes/_authenticated/operator.preview.tsx`
   - Import `MeetingPointMap` and render `<section id="map">…</section>` after the existing `PoliciesBlock` (or near the bottom of the main content stack — same horizontal padding as siblings).
   - Pass `address={operator.default_departure_address}`, `lat={operator.default_departure_lat}`, `lng={operator.default_departure_lng}` from the loaded operator record.

3. **Header link** `src/components/operator-listing/HeaderGallery.tsx`
   - The existing `<a href="#map">Show map</a>` already points to the right anchor — no change needed beyond adding the `id="map"` section. Browser-native smooth scroll already works because the global CSS sets `scroll-behavior: smooth` (verify; if not, add `scroll-mt-20` on the section to clear the sticky nav).

4. **Optional polish** `src/components/operator-listing/SectionNav.tsx`
   - Add a new nav item `{ href: "#map", label: "Meeting point", icon: MapPin }` so users can jump there from the sticky section nav too.

No DB migrations, no new server functions, no new secrets — the meeting-point coordinates already exist on `operators` (`default_departure_address`, `default_departure_lat`, `default_departure_lng`), and the Google Maps browser key is already provisioned via the connector.
