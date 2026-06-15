import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AvailabilityEditor } from "./AvailabilityEditor";
import type { AvailabilityRow } from "@/lib/availability.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (row: AvailabilityRow) => void;
}

export function AvailabilityDrawer({ open, onOpenChange, onSaved }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto bg-white sm:max-w-[480px]"
        style={{ borderLeft: "4px solid #FFD23F" }}
      >
        <SheetHeader>
          <SheetTitle className="text-xl">My Lab Hours</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <AvailabilityEditor
            refreshKey={open ? 1 : 0}
            onSaved={(row) => {
              onSaved?.(row);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
