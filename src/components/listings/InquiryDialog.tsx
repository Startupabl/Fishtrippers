import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { createInquiry } from "@/lib/inquiries.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  journeyId: string;
  journeyTitle: string;
  mentorName: string;
}

type TimeOfDay = "morning" | "afternoon" | "evening" | "flexible";

export function InquiryDialog({ open, onOpenChange, journeyId, journeyTitle, mentorName }: Props) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const create = useServerFn(createInquiry);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<TimeOfDay | "">("");
  const [goals, setGoals] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = !!date && !!time && goals.trim().length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !date || !time) return;
    setSubmitting(true);
    try {
      const { thread_id } = await create({
        data: {
          journey_id: journeyId,
          preferred_date: format(date, "yyyy-MM-dd"),
          preferred_time: time,
          message_body: goals.trim(),
        },
      });
      toast.success(`Inquiry sent to ${mentorName}!`, {
        description: "Continue the conversation in your messages.",
      });
      onOpenChange(false);
      setGoals("");
      setDate(undefined);
      setTime("");
      navigate({ to: "/dashboard/messages/$threadId", params: { threadId: thread_id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send inquiry.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check specific dates with {mentorName}</DialogTitle>
          <DialogDescription>
            Tell {mentorName} when you'd like to start "{journeyTitle}". They'll reply with a confirmed time, then send you a payment link.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Log in or sign up to send an inquiry — it takes 10 seconds.
            </p>
            <Button asChild variant="info" className="w-full">
              <Link to="/login">Log in to continue</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>When are you looking to start?</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-of-day">Preferred time of day?</Label>
              <Select value={time} onValueChange={(v) => setTime(v as TimeOfDay)}>
                <SelectTrigger id="time-of-day">
                  <SelectValue placeholder="Choose a time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Any specific goals for this course?</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={4}
                placeholder="Share what you'd like to learn or achieve…"
              />
              <p className="text-xs text-muted-foreground">
                {goals.trim().length < 10
                  ? `Add at least ${10 - goals.trim().length} more character${10 - goals.trim().length === 1 ? "" : "s"}.`
                  : "Looks good."}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                variant="info"
                disabled={!valid || submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1 size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send Inquiry"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
