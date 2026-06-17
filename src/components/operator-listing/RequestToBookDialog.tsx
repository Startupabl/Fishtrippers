import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { submitTripRequest } from "@/lib/trip-requests.functions";
import { useAuthStore } from "@/stores/useAuthStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripTitle: string;
  defaultStartTime?: string | null;
  defaultDurationHours?: number;
  minParty: number;
  maxParty: number;
}

export function RequestToBookDialog({
  open,
  onOpenChange,
  tripId,
  tripTitle,
  defaultStartTime,
  defaultDurationHours = 4,
  minParty,
  maxParty,
}: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const submit = useServerFn(submitTripRequest);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>(defaultStartTime ?? "");
  const [hours, setHours] = useState<number>(defaultDurationHours);
  const [guests, setGuests] = useState<number>(minParty);
  const [message, setMessage] = useState<string>("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Pick a date.");
      if (!message.trim()) throw new Error("Add a short message.");
      return submit({
        data: {
          trip_id: tripId,
          date: format(date, "yyyy-MM-dd"),
          start_time: time ? time : null,
          duration_hours: hours,
          guests,
          message: message.trim(),
        },
      });
    },
    onSuccess: ({ thread_id }) => {
      toast.success("Request sent! The host will reply in your inbox.");
      onOpenChange(false);
      navigate({
        to: "/dashboard/messages/$threadId",
        params: { threadId: thread_id },
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send request."),
  });

  const handleSubmit = () => {
    if (!user) {
      toast.error("Please sign in to send a request.");
      navigate({ to: "/login" });
      return;
    }
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request to book — {tripTitle}</DialogTitle>
          <DialogDescription>
            Send the host your preferred date, time, and party. They&apos;ll reply with a
            custom offer in your inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Preferred date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label htmlFor="time">Preferred time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="hours">Duration (hours)</Label>
              <Input
                id="hours"
                type="number"
                min={1}
                max={72}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guests">Guests</Label>
              <Input
                id="guests"
                type="number"
                min={minParty}
                max={maxParty}
                value={guests}
                onChange={(e) => {
                  const n = Number(e.target.value) || minParty;
                  setGuests(Math.min(maxParty, Math.max(minParty, n)));
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="msg">Message to host</Label>
            <Textarea
              id="msg"
              rows={4}
              placeholder="Tell the host about your group, experience level, and what you'd like to target."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mut.isPending || !date || !message.trim()}>
            {mut.isPending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
