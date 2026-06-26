import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import { useCurrencies } from "@/hooks/useCurrencies";
import { detectCurrencyByIp } from "@/lib/detect-currency";
import { getCurrencyPreference } from "@/lib/currency-preference.functions";

/**
 * Silently chooses the display currency on first load:
 * 1. signed-in profile.currency_preference (highest priority)
 * 2. guest manual selection persisted in localStorage
 * 3. IP-based auto-detect → fall back to USD if not in catalog
 */
export function CurrencyBootstrapper() {
  const { currencies } = useCurrencies();
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const hasManual = useCurrencyStore((s) => s.hasManualCurrency);
  const didDetect = useRef(false);

  // Signed-in profile preference takes precedence — runs whenever auth state
  // resolves with a session.
  const getPref = useServerFn(getCurrencyPreference);
  const sessionQ = useQuery({
    queryKey: ["auth-session-currency"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
    staleTime: 60 * 1000,
  });
  const prefQ = useQuery({
    queryKey: ["profile-currency-preference", sessionQ.data?.user?.id ?? null],
    queryFn: () => getPref(),
    enabled: Boolean(sessionQ.data?.user?.id),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const pref = prefQ.data?.currency;
    if (pref && currencies.some((c) => c.code === pref)) {
      // Mark as non-manual so logout doesn't lock guest into this code, but
      // still wins over IP detection while signed in.
      setCurrency(pref, false);
      didDetect.current = true;
    }
  }, [prefQ.data, currencies, setCurrency]);

  useEffect(() => {
    if (didDetect.current) return;
    if (hasManual) {
      didDetect.current = true;
      return;
    }
    if (sessionQ.data?.user?.id) return; // wait for profile pref query
    if (currencies.length === 0) return;
    didDetect.current = true;
    const allowed = new Set(currencies.map((c) => c.code));
    detectCurrencyByIp(allowed).then((code) => {
      setCurrency(code, false);
    });
  }, [hasManual, currencies, sessionQ.data, setCurrency]);

  return null;
}
