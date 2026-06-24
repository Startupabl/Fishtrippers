import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { resolvePlace } from "@/lib/trips.functions";
import { parseCityStateCountry } from "@/lib/address.shared";

  if (!address) return { city: null, state: null, country: null };
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { city: null, state: null, country: null };
  const hasCountry = parts.length >= 4;
  const country = hasCountry ? parts[parts.length - 1] : null;
  const stateZipIdx = hasCountry ? parts.length - 2 : parts.length - 1;
  const cityIdx = stateZipIdx - 1;
  if (cityIdx < 0) return { city: null, state: null, country };
  const city = parts[cityIdx] || null;
  const stateZip = parts[stateZipIdx] || "";
  const stateMatch = stateZip.match(/^([A-Za-z]{2,})\b/);
  const state = stateMatch ? stateMatch[1].toUpperCase() : null;
  return { city, state, country };
}


interface SelectedPlace {
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

interface Props {
  value: SelectedPlace;
  onChange: (v: SelectedPlace) => void;
}

interface Suggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

let mapsLoader: Promise<any> | null = null;
function loadMapsApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("missing-browser-key"));
      return;
    }
    (window as any).__lovableInitMaps = () => resolve((window as any).google);
    const script = document.createElement("script");
    const channel = TRACKING_ID ? `&channel=${TRACKING_ID}` : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&libraries=places&callback=__lovableInitMaps${channel}`;
    script.async = true;
    script.onerror = () => reject(new Error("maps-load-failed"));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

export function DeparturePointPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const resolvePlaceFn = useServerFn(resolvePlace);

  useEffect(() => {
    setQuery(value.address);
  }, [value.address]);

  useEffect(() => {
    loadMapsApi()
      .then(async (g) => {
        const lib = await g.maps.importLibrary("places");
        placesLibRef.current = lib;
        sessionTokenRef.current = new (lib as any).AutocompleteSessionToken();
        setMapsReady(true);
      })
      .catch((e) => {
        setError(
          e.message === "missing-browser-key"
            ? "Maps not configured — type the address manually."
            : "Map autocomplete unavailable — type the address manually.",
        );
      });
  }, []);

  useEffect(() => {
    if (!mapsReady || !query.trim() || query === value.address) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const { AutocompleteSuggestion } = placesLibRef.current;
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current,
        });
        const items: Suggestion[] = (res.suggestions ?? [])
          .map((s: any) => {
            const p = s.placePrediction;
            if (!p) return null;
            return {
              placeId: p.placeId,
              primaryText: p.mainText?.text ?? p.text?.text ?? "",
              secondaryText: p.secondaryText?.text ?? "",
            };
          })
          .filter(Boolean) as Suggestion[];
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch {
        // ignore network blips
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, mapsReady, value.address]);

  const handlePick = async (s: Suggestion) => {
    setOpen(false);
    setQuery(`${s.primaryText}${s.secondaryText ? ", " + s.secondaryText : ""}`);
    try {
      setLoading(true);
      const r = await resolvePlaceFn({ data: { placeId: s.placeId } });
      const fullAddress = r.address || `${s.primaryText}, ${s.secondaryText}`;
      const fallback = parseCityStateCountry(fullAddress);
      onChange({
        address: fullAddress,
        lat: r.lat,
        lng: r.lng,
        placeId: r.placeId,
        city: ((r as any).city ?? null) || fallback.city,
        state: ((r as any).state ?? null) || fallback.state,
        country: ((r as any).country ?? null) || fallback.country,
      });
      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      }
    } catch (err) {
      const fallbackAddress = `${s.primaryText}, ${s.secondaryText}`;
      const fallback = parseCityStateCountry(fallbackAddress);
      toast.error(
        "Couldn't fully verify that address with Google — we saved it, but please double-check city/region.",
      );
      console.warn("resolvePlace failed", err);
      onChange({
        address: fallbackAddress,
        lat: null,
        lng: null,
        placeId: s.placeId,
        city: fallback.city,
        state: fallback.state,
        country: fallback.country,
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search marina, ramp, or address…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) {
              onChange({ address: "", lat: null, lng: null, placeId: null });
            }
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePick(s);
                  }}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.primaryText}</span>
                    {s.secondaryText && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.secondaryText}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value.address && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{value.address}</div>
            {value.lat != null && value.lng != null && (
              <div className="text-xs text-muted-foreground">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              onChange({ address: "", lat: null, lng: null, placeId: null });
            }}
          >
            Change
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
