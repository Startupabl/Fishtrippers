import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { useCurrencies } from "@/hooks/useCurrencies";
import { supabase } from "@/integrations/supabase/client";
import { updateCurrencyPreference } from "@/lib/currency-preference.functions";

export function CurrencySwitcher() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const { currencies } = useCurrencies();
  const current = currencies.find((c) => c.code === currency) ?? currencies[0];
  const savePref = useServerFn(updateCurrencyPreference);

  async function handlePick(code: CurrencyCode) {
    if (code === currency) return;
    setCurrency(code, true);
    toast.success(`Showing prices in ${code}`);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        await savePref({ data: { currency: code } });
      }
    } catch {
      /* non-blocking */
    }
  }

  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change currency"
          aria-haspopup="menu"
          className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-border/60 bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden>{current.flag}</span>
          <span>{current.code}</span>
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-48 overflow-y-auto">
        {currencies.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onSelect={() => handlePick(c.code)}
            className="min-h-11 cursor-pointer text-sm"
          >
            <span aria-hidden className="mr-2">
              {c.flag}
            </span>
            <span className="font-medium text-foreground">{c.code}</span>
            <span className="ml-2 text-muted-foreground">· {c.name}</span>
            {c.code === currency && (
              <Check className="ml-auto size-4 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
