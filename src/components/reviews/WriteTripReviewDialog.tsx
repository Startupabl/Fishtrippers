import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitTripReview } from "@/lib/reviews.functions";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  tripTitle: string;
}

export function WriteTripReviewDialog({
  open,
  onOpenChange,
  bookingId,
  tripTitle,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useServerFn(submitTripReview);
  const qc = useQueryClient();

  const reset = () => {
    setRating(0);
    setHover(0);
    setTitle("");
    setDescription("");
  };

  async function handleSubmit() {
    if (rating < 1) return toast.error("Please select a star rating");
    if (!title.trim() || !description.trim())
      return toast.error("Title and description are required");
    setSubmitting(true);
    try {
      await submit({
        data: {
          bookingId,
          rating,
          title: title.trim(),
          description: description.trim(),
        },
      });
      toast.success("Review submitted — thank you!");
      qc.invalidateQueries({ queryKey: ["my-reviewed-bookings"] });
      qc.invalidateQueries({ queryKey: ["learner-trip-bookings"] });
      qc.invalidateQueries({ queryKey: ["listing-reviews"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write a review</DialogTitle>
          <DialogDescription className="line-clamp-2">{tripTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Your rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        active
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="trip-review-title">Review title</Label>
              <span className="text-xs text-muted-foreground">
                {title.length}/50
              </span>
            </div>
            <Input
              id="trip-review-title"
              maxLength={50}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your trip"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="trip-review-desc">Review description</Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/500
              </span>
            </div>
            <Textarea
              id="trip-review-desc"
              maxLength={500}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How was your trip with the captain?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
