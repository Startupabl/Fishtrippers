## Goal
Expand the currency system from a hardcoded 5-currency list to a DB-backed, dynamically loaded set (17 currencies), add silent IP-based auto-detection, persist user/guest preference, and fix rounding to exactly 2 decimals.

## 1. Database

New `public.currencies` table:
- `code` (text, PK, e.g. `MXN`)
- `name` (text, e.g. `Mexican Peso`)
- `symbol` (text, e.g. `$`)
- `flag` (text, emoji — keeps current UI parity)
- `sort_order` (int, for stable dropdown order)
- standard `created_at` / `updated_at`

Public `SELECT` to `anon` + `authenticated` (read-only catalog).

Seed: USD, EUR, GBP, CAD, AUD, MXN, THB, PHP, IDR, MYR, BRL, CRC, JPY, CHF, NZD, SGD, CNY.

Add `currency_preference text` column to `public.profiles` (nullable, FK-ish via app logic to currencies.code).

## 2. FX rates

Update `src/lib/fx.functions.ts`:
- Fetch all 17 symbols from Frankfurter (it covers most; for any missing — e.g. CRC, PHP — fall back to a secondary free endpoint `https://open.er-api.com/v6/latest/USD` and merge). Cache 24h in-memory.
- Return all rates keyed by code.

Update `src/lib/currency.ts`:
- Replace hardcoded `CurrencyCode` union + `SUPPORTED_CURRENCIES` with a runtime list loaded from DB.
- `CurrencyCode = string` (validated against loaded list); keep `convertMinor` and a `setLiveFxRates` that accepts any code.
- `FX_RATES` becomes a plain `Record<string, number>` seeded with USD=1; hydrated by `useFxRates`.

## 3. Currencies catalog hook

New `src/lib/currencies.functions.ts` — `getCurrencies()` server fn (public, reads `currencies` table via publishable client).
New `src/hooks/useCurrencies.ts` — React Query hook, long stale time, exposes `currencies` array used by all dropdowns.

## 4. Store + preference persistence

Update `src/stores/useCurrencyStore.ts`:
- Drop the union type; `currency: string`.
- Keep `hasManualCurrency` flag for guests.
- Add `setCurrency` to also fire a fire-and-forget call to a new server fn `updateCurrencyPreference` when the user is signed in.

New server fn `updateCurrencyPreference` (uses `requireSupabaseAuth`) writes `profiles.currency_preference`.

On app boot (in `__root.tsx` or a small `CurrencyBootstrapper` component):
1. If user signed in and `profiles.currency_preference` exists → use it (overrides everything).
2. Else if guest has `hasManualCurrency` in localStorage → keep it.
3. Else call `https://ipapi.co/json/` (free, no key, HTTPS, returns `country_code` + `currency`) to detect. Set silently if currency is in our catalog; otherwise default to USD.
4. Never show a banner/toast for auto-detection (toast only on manual change — already the case).

Detection helper replaces `src/lib/detect-currency.ts` (keep file, swap to IP-based; keep locale heuristic as offline fallback if fetch fails).

## 5. Rounding

Update `formatCurrency` in `src/lib/format-currency.ts` to force `minimumFractionDigits: 2, maximumFractionDigits: 2` so display is always exactly `$143.27` regardless of locale defaults (JPY normally has 0 decimals — user explicitly wants 2).

## 6. UI

`CurrencySwitcher.tsx`: load list from `useCurrencies()` instead of static `SUPPORTED_CURRENCIES`. Same visual style. Already present in header — confirms "always accessible".

No other component changes required: every price display already routes through `useCurrencyStore` + `convertMinor` + `formatCurrency`.

## Out of scope
- Admin UI to add/edit currencies (DB-only management per instructions — "added in the database without code changes").
- Changing the underlying transactional currency (Stripe charge currency) — display-only conversion stays as today.

## Files touched
- New migration (`currencies` table + seed + `profiles.currency_preference`).
- New: `src/lib/currencies.functions.ts`, `src/hooks/useCurrencies.ts`, `src/lib/currency-preference.functions.ts`, `src/components/layout/CurrencyBootstrapper.tsx`.
- Edit: `src/lib/currency.ts`, `src/lib/fx.functions.ts`, `src/lib/format-currency.ts`, `src/lib/detect-currency.ts`, `src/stores/useCurrencyStore.ts`, `src/components/layout/CurrencySwitcher.tsx`, `src/routes/__root.tsx` (mount bootstrapper + ensure `useFxRates` runs).
