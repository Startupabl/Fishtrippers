## Fix

In `src/components/operator-onboarding/trips/TripFormDialog.tsx`, the `useEffect` that seeds a new trip (lines 148–165) inherits environments but never pulls the saved default departure point from `useOperatorOnboardingStore`. So new trips always open with an empty address.

Update the new-trip seed block to also prefill departure fields from `defaultDeparture` when present:

```ts
const seeded: TripEditorState = next.id
  ? next
  : {
      ...next,
      environments: next.environments.length > 0 ? next.environments : captainEnvs,
      charter_type: defaultPrivateType,
      departure_address: hasDefault ? defaultDeparture.address : next.departure_address,
      departure_lat: hasDefault ? defaultDeparture.lat : next.departure_lat,
      departure_lng: hasDefault ? defaultDeparture.lng : next.departure_lng,
      departure_place_id: hasDefault ? defaultDeparture.place_id : next.departure_place_id,
    };
```

Also add `defaultDeparture` to the effect's deps so it picks up after the saved default loads. No other files change.