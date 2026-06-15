import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";
import { useCheckoutStore } from "@/stores/useCheckoutStore";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { displayMentorName } from "@/lib/mentor-display";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const subtotalFn = useCartStore((s) => s.subtotalMinor);
  const currencyFn = useCartStore((s) => s.currency);
  const setSelection = useCheckoutStore((s) => s.setSelection);
  const navigate = useNavigate();

  const subtotal = subtotalFn();
  const currency = currencyFn();
  const count = items.length;
  const display = useCurrencyStore((s) => s.currency);
  const fmt = (minor: number, from: string) =>
    formatCurrency(convertMinor(minor, from as CurrencyCode, display), display);

  function handleCheckout() {
    const first = items[0];
    if (!first) return;
    setSelection({
      pathId: first.pathId,
      mentorId: first.pathSlug,
      mentorName: first.mentorName,
      mentorAvatarUrl: first.mentorAvatarUrl,
      pathTitle: first.pathTitle,
      highlights: [],
      priceMinor: first.priceMinor,
      currency: first.currency,
      sessionDateIso: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      sessionTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setOpen(false);
    navigate({ to: "/checkout" });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Open shopping bag (${count} item${count === 1 ? "" : "s"})`}
          className="relative inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: DESIGN_SYSTEM.colors.primaryBlue }}
            >
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Bag {count > 0 && <span className="text-muted-foreground">({count})</span>}</SheetTitle>
        </SheetHeader>

        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Your bag is empty.</p>
            <Button asChild variant="ghost" className="rounded-2xl">
              <Link to="/" onClick={() => setOpen(false)}>
                Browse Courses
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
              {items.map((i) => (
                <li
                  key={i.pathId}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  {i.mentorAvatarUrl ? (
                    <img
                      src={i.mentorAvatarUrl}
                      alt={displayMentorName(i.mentorName)}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm text-foreground"
                      style={{ fontFamily: DESIGN_SYSTEM.fonts.serif }}
                    >
                      {i.pathTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">{displayMentorName(i.mentorName)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm text-foreground">
                      {fmt(i.priceMinor, i.currency)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${i.pathTitle}`}
                      onClick={() => remove(i.pathId)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span
                  className="text-lg text-foreground"
                  style={{ fontFamily: DESIGN_SYSTEM.fonts.serif }}
                >
                  {fmt(subtotal, currency)}
                </span>
              </div>
              <Button
                type="button"
                variant="money"
                onClick={handleCheckout}
                disabled={count === 0}
                className="mt-3 min-h-12 w-full rounded-2xl text-base font-semibold"
              >
                Checkout
              </Button>
              <button
                type="button"
                onClick={clear}
                className="mt-2 w-full rounded-md py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear bag
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
