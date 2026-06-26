import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  sort_order: number;
}

export const getCurrencies = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("currencies")
    .select("code, name, symbol, flag, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return { currencies: (data ?? []) as CurrencyRow[] };
});
