import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { updateAdminReview, type AdminReviewRow } from "@/lib/admin-reviews.functions";
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

interface Props {
  review: AdminReviewRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditReviewDialog({ review, open, onOpenChange }: Props) {
  const update = useServerFn(updateAdminReview);
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hover, setHover] = useState(0);

  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setTitle(review.title);
      setDescription(review.description);
    }
  }, [review]);

  const mutation = useMutation({
    mutationFn: () =>
      update({ data: { id: review!.id, rating, title: title.trim(), description: description.trim() } }),
    onSuccess: () => {
      toast.success("Review updated");
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave =
    title.trim().length > 0 &&
    title.trim().length <= 50 &&
    description.trim().length > 0 &&
    description.trim().length <= 500 &&
    rating >= 1 &&
    rating <= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription>Modify the rating, title, or description.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Rating</Label>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    className="p-1"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={
                        filled
                          ? "h-7 w-7 fill-amber-400 text-amber-400"
                          : "h-7 w-7 text-muted-foreground"
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="review-title">Title</Label>
              <span className="text-xs text-muted-foreground">{title.length}/50</span>
            </div>
            <Input
              id="review-title"
              value={title}
              maxLength={50}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="review-desc">Description</Label>
              <span className="text-xs text-muted-foreground">{description.length}/500</span>
            </div>
            <Textarea
              id="review-desc"
              value={description}
              maxLength={500}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
