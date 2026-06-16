import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Banknote } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startStripeConnectOnboarding } from "@/lib/payouts.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLater?: () => void;
}

export function ConnectPayoutsDialog({ open, onOpenChange, onLater }: Props) {
  const start = useServerFn(startStripeConnectOnboarding);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { url } = await start();
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error("Could not start Stripe onboarding");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start Stripe onboarding");
      setLoading(false);
    }
  };

  const handleLater = () => {
    onOpenChange(false);
    onLater?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Banknote className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">One more thing — connect payouts</DialogTitle>
          <DialogDescription className="text-center">
            Your listing is in review. To accept bookings the moment we approve it,
            connect your Stripe account now. Without payouts connected we can&apos;t
            approve your listing.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect Stripe
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            disabled={loading}
            className="w-full"
          >
            I&apos;ll do this later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
