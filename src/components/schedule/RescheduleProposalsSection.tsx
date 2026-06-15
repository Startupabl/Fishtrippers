import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listMyRescheduleProposals,
  respondToReschedule,
} from "@/lib/schedule.functions";

function fmt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return iso;
  }
}

export function RescheduleProposalsSection() {
  const listFn = useServerFn(listMyRescheduleProposals);
  const respondFn = useServerFn(respondToReschedule);
  const queryClient = useQueryClient();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: proposals } = useQuery({
    queryKey: ["my-reschedule-proposals"],
    queryFn: () => listFn(),
  });

  const items = proposals ?? [];
  if (items.length === 0) return null;

  async function handleRespond(
    classSessionId: string,
    slotIndex: number,
    accept: boolean,
  ) {
    const key = `${classSessionId}:${slotIndex}:${accept}`;
    setBusyKey(key);
    try {
      await respondFn({
        data: { class_session_id: classSessionId, slot_index: slotIndex, accept },
      });
      toast.success(accept ? "New time confirmed." : "Reschedule declined.");
      await queryClient.invalidateQueries({
        queryKey: ["my-reschedule-proposals"],
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not respond.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="mt-6 space-y-3">
      {items.map((p) => {
        const key = `${p.classSessionId}:${p.slotIndex}`;
        return (
          <div
            key={key}
            className="rounded-md border border-amber-300 bg-amber-50 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                Reschedule request
              </Badge>
              <span className="font-medium">{p.listingTitle}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Current time</div>
                <div className="font-medium">
                  {fmt(p.originalStartIso)} ({p.originalDurationMinutes} min)
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Proposed time</div>
                <div className="font-medium text-amber-700">
                  {fmt(p.proposedStartIso)} ({p.proposedDurationMinutes} min)
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={busyKey?.startsWith(key) ?? false}
                onClick={() =>
                  handleRespond(p.classSessionId, p.slotIndex, true)
                }
              >
                Accept new time
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                disabled={busyKey?.startsWith(key) ?? false}
                onClick={() =>
                  handleRespond(p.classSessionId, p.slotIndex, false)
                }
              >
                Decline
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
