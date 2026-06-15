import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { SUPPORTED_CURRENCIES, getCurrencyMeta } from "@/lib/currency";

export function CurrencySwitcher() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const current = getCurrencyMeta(currency);

  function handlePick(code: CurrencyCode) {
    if (code === currency) return;
    setCurrency(code);
    toast.success(`Showing prices in ${code}`);
  }

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
      <DropdownMenuContent align="end" className="min-w-48">
        {SUPPORTED_CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onSelect={() => handlePick(c.code)}
            className="min-h-11 cursor-pointer text-sm"
          >
            <span aria-hidden className="mr-2">
              {c.flag}
            </span>
            <span className="font-medium text-foreground">{c.code}</span>
            <span className="ml-2 text-muted-foreground">· {c.label}</span>
            {c.code === currency && (
              <Check className="ml-auto size-4 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
