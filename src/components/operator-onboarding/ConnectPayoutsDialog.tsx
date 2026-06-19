import { useNavigate } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLater?: () => void;
}

export function ListingSubmittedDialog({ open, onOpenChange, onLater }: Props) {
  const navigate = useNavigate();

  const handleGoToListings = () => {
    onOpenChange(false);
    navigate({ to: "/dashboard/my-listing" });
  };

  const handleClose = () => {
    onOpenChange(false);
    onLater?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Listing submitted for review</DialogTitle>
          <DialogDescription className="text-center">
            Thanks! Our team will review your listing within 24 hours. In the
            meantime, head to <strong>My Listings</strong> to manage your trips,
            availability, and photos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={handleGoToListings} className="w-full" size="lg">
            Go to My Listings
          </Button>
          <Button variant="ghost" onClick={handleClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Back-compat alias so existing call sites keep working.
export const ConnectPayoutsDialog = ListingSubmittedDialog;
