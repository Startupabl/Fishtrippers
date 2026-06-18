import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Calendar as CalendarIcon, Users, ChevronDown, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LocationAutocomplete, type PickedLocation } from "@/components/search/LocationAutocomplete";
import { cn } from "@/lib/utils";

export function HeroBookingBar() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const submit = () => {
    const params: Record<string, string> = {};
    if (picked) {
      if (picked.city) params.city = picked.city;
      if (picked.state) params.state = picked.state;
      if (picked.country) params.country = picked.country;
    } else if (location.trim()) {
      // Treat free-text as a city query so it still hits the search.
      params.city = location.trim();
    }
    if (date) params.tripDate = format(date, "yyyy-MM-dd");
    if (adults) params.adults = String(adults);
    if (children) params.children = String(children);
    navigate({ to: "/search", search: params as never });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-1 gap-2 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center md:gap-0 md:rounded-full md:p-1.5"
    >
      {/* Location */}
      <div className="rounded-xl px-4 py-3 md:rounded-full md:border-r md:border-border">
        <LocationAutocomplete
          value={location}
          onChangeText={(v) => {
            setLocation(v);
            if (!v.trim()) setPicked(null);
          }}
          onPick={(loc) => {
            setLocation(loc.address);
            setPicked(loc);
          }}
          onSubmitFreeText={submit}
          placeholder="Fishing near me"
          ariaLabel="Where do you want to fish?"
          leadingIcon={<MapPin className="size-5 shrink-0 text-ocean" />}
        />
      </div>


      {/* Date */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left md:rounded-none md:border-r md:border-border"
          >
            <CalendarIcon className="size-5 shrink-0 text-ocean" />
            <span className={cn("flex-1 text-base", date ? "text-ocean-deep" : "text-muted-foreground")}>
              {date ? format(date, "MMM d, yyyy") : "Select date"}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Guests */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left md:rounded-none"
          >
            <Users className="size-5 shrink-0 text-ocean" />
            <span className="flex-1 text-base text-ocean-deep">
              {adults} {adults === 1 ? "adult" : "adults"} · {children} {children === 1 ? "child" : "children"}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <Stepper label="Adults" sublabel="Ages 13+" value={adults} onChange={setAdults} min={1} />
          <div className="mt-3">
            <Stepper label="Children" sublabel="Ages 0–12" value={children} onChange={setChildren} min={0} />
          </div>
        </PopoverContent>
      </Popover>

      {/* CTA */}
      <Button
        type="submit"
        className="h-12 w-full rounded-xl bg-gold px-6 text-base font-bold text-ocean-deep shadow-sm hover:bg-gold-deep md:h-14 md:w-auto md:rounded-full md:px-8"
      >
        Check availability
      </Button>
    </form>
  );
}

function Stepper({
  label,
  sublabel,
  value,
  onChange,
  min,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-ocean-deep">{label}</div>
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="inline-flex size-8 items-center justify-center rounded-full border border-border text-ocean-deep disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center text-base font-semibold tabular-nums text-ocean-deep">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="inline-flex size-8 items-center justify-center rounded-full border border-border text-ocean-deep"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default HeroBookingBar;
