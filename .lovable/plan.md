## Bug

`RootComponent` in `src/routes/__root.tsx` calls `useFxRates()` (which uses `useQuery`) *outside* the `<QueryClientProvider>`. SSR throws "No QueryClient set" → blank app.

## Fix

Move the `useFxRates()` call into a tiny child component rendered *inside* `<QueryClientProvider>`, so the hook runs within the Query context.

```tsx
function FxRatesLoader() {
  useFxRates();
  return null;
}
```

Remove `useFxRates()` from `RootComponent` and render `<FxRatesLoader />` inside both `<QueryClientProvider>` branches (admin + main).

`useAuthListener()` does not depend on Query, so it can stay where it is.

No other files affected.