import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { upsertTrip } from "@/lib/trips.functions";
import { saveDefaultDeparture } from "@/lib/operators.functions";
import { DURATION_OPTIONS } from "@/lib/trips.shared";
import { DeparturePointPicker } from "./DeparturePointPicker";
import { Checkbox } from "@/components/ui/checkbox";
import { useOperatorOnboardingStore } from "@/stores/useOperatorOnboardingStore";

export interface TripEditorState {
  id?: string | null;
  title: string;
  description: string;
  duration_minutes: number | null;
  price_minor: number | null;
  template_key?: string | null;
  departure_address: string;
  departure_lat: number | null;
  departure_lng: number | null;
  departure_place_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: TripEditorState | null;
}

const empty: TripEditorState = {
  id: null,
  title: "",
  description: "",
  duration_minutes: null,
  price_minor: null,
  template_key: null,
  departure_address: "",
  departure_lat: null,
  departure_lng: null,
  departure_place_id: null,
};

export function TripFormDialog({ open, onOpenChange, initial }: Props) {
  const [form, setForm] = useState<TripEditorState>(initial ?? empty);
  const [priceInput, setPriceInput] = useState("");
  const defaultDeparture = useOperatorOnboardingStore((s) => s.default_departure);
  const setDefaultDeparture = useOperatorOnboardingStore((s) => s.setDefaultDeparture);
  const hasDefault = !!defaultDeparture.address;
  const [saveAsDefault, setSaveAsDefault] = useState(!hasDefault);
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertTrip);
  const saveDefaultFn = useServerFn(saveDefaultDeparture);

  useEffect(() => {
    if (open) {
      const next = initial ?? empty;
      setForm(next);
      setPriceInput(next.price_minor != null ? (next.price_minor / 100).toString() : "");
      setSaveAsDefault(!hasDefault);
    }
  }, [open, initial, hasDefault]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Trip name is required");
      if (!form.duration_minutes) throw new Error("Pick a duration");
      if (form.price_minor == null || form.price_minor < 0)
        throw new Error("Enter a price");
      if (form.description.trim().length < 10)
        throw new Error("Description is too short");
      if (!form.departure_address.trim())
        throw new Error("Pick a departure point");
      return upsertFn({
        data: {
          id: form.id ?? null,
          title: form.title.trim(),
          description: form.description.trim(),
          duration_minutes: form.duration_minutes!,
          price_minor: form.price_minor!,
          currency: "USD",
          template_key: form.template_key ?? null,
          departure_address: form.departure_address.trim(),
          departure_lat: form.departure_lat,
          departure_lng: form.departure_lng,
          departure_place_id: form.departure_place_id,
        },
      });
    },
    onSuccess: () => {
      toast.success(form.id ? "Trip updated" : "Trip added");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save trip"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit trip" : "Add a trip"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-title">Trip name</Label>
            <Input
              id="trip-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Half-Day Deep Sea"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={form.duration_minutes ? String(form.duration_minutes) : ""}
                onValueChange={(v) =>
                  setForm({ ...form, duration_minutes: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-price">Price (USD)</Label>
              <Input
                id="trip-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                value={priceInput}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  const n = Number(e.target.value);
                  setForm({
                    ...form,
                    price_minor: Number.isFinite(n) ? Math.round(n * 100) : null,
                  });
                }}
                placeholder="e.g. 650"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-desc">Description</Label>
            <Textarea
              id="trip-desc"
              rows={4}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's included, target species, what to bring…"
            />
          </div>

          <div className="space-y-2">
            <Label>Departure point</Label>
            <DeparturePointPicker
              value={{
                address: form.departure_address,
                lat: form.departure_lat,
                lng: form.departure_lng,
                placeId: form.departure_place_id,
              }}
              onChange={(v) =>
                setForm({
                  ...form,
                  departure_address: v.address,
                  departure_lat: v.lat,
                  departure_lng: v.lng,
                  departure_place_id: v.placeId,
                })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : form.id ? "Save changes" : "Add trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
