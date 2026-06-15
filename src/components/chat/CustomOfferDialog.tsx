import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getCurrencyMeta } from "@/lib/currency";
import type { CurrencyCode } from "@/stores/useCurrencyStore";
import type { CustomOffer } from "@/stores/useChatStore";

interface CustomOfferDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCurrency: CurrencyCode;
  onSubmit: (offer: CustomOffer) => void;
}

export function CustomOfferDialog({
  open,
  onOpenChange,
  defaultCurrency,
  onSubmit,
}: CustomOfferDialogProps) {
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState(1);
  const [priceMajor, setPriceMajor] = useState(0);

  const ok =
    description.trim().length >= 10 && sessions >= 1 && priceMajor >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Custom Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you cover? Any deliverables?"
              className="mt-1 min-h-24 rounded-xl"
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Sessions</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={sessions}
                onChange={(e) => setSessions(Number(e.target.value))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-muted-foreground">
                  {getCurrencyMeta(defaultCurrency).symbol}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={priceMajor === 0 ? "" : String(priceMajor)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    setPriceMajor(digits === "" ? 0 : parseInt(digits, 10));
                  }}
                  placeholder="150"
                  className="rounded-xl pl-8"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ok}
            onClick={() => {
              onSubmit({
                description: description.trim(),
                sessions,
                priceMinor: Math.round(priceMajor * 100),
                currency: defaultCurrency,
              });
              setDescription("");
              setSessions(1);
              setPriceMajor(0);
              onOpenChange(false);
            }}
          >
            Send Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
