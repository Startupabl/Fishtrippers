import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { resolvePlacePublic } from "@/lib/operators-search.functions";
import { cn } from "@/lib/utils";

export interface PickedLocation {
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
}

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onPick: (loc: PickedLocation) => void;
  onSubmitFreeText?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Tailwind class override for the underlying <input>. */
  inputClassName?: string;
  /** Render slot before the input (icon usually). */
  leadingIcon?: React.ReactNode;
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

export function LocationAutocomplete({
  value,
  onChangeText,
  onPick,
  onSubmitFreeText,
  placeholder = "Where do you want to fish?",
  ariaLabel = "Location",
  inputClassName,
  leadingIcon,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const lastPickedRef = useRef<string>("");
  const resolveFn = useServerFn(resolvePlacePublic);

  useEffect(() => {
    loadMapsApi()
      .then(async (g) => {
        const lib = await g.maps.importLibrary("places");
        placesLibRef.current = lib;
        sessionTokenRef.current = new (lib as any).AutocompleteSessionToken();
        setMapsReady(true);
      })
      .catch(() => {
        // Fall back to plain text — user can still type and submit.
      });
  }, []);

  useEffect(() => {
    if (!mapsReady) return;
    const q = value.trim();
    if (!q || q === lastPickedRef.current) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = placesLibRef.current;
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: sessionTokenRef.current,
          includedPrimaryTypes: ["(regions)"],
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
        // ignore transient errors
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [value, mapsReady]);

  const handlePick = async (s: Suggestion) => {
    const display = `${s.primaryText}${s.secondaryText ? ", " + s.secondaryText : ""}`;
    lastPickedRef.current = display;
    onChangeText(display);
    setOpen(false);
    try {
      setLoading(true);
      const r = await resolveFn({ data: { placeId: s.placeId } });
      onPick({
        address: r.address || display,
        city: r.city,
        state: r.state,
        country: r.country,
        lat: r.lat,
        lng: r.lng,
        placeId: r.placeId,
      });
      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      }
    } catch {
      // Fall back: keep what user picked, no components.
      onPick({
        address: display,
        city: s.primaryText || null,
        state: null,
        country: null,
        lat: null,
        lng: null,
        placeId: s.placeId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-3">
        {leadingIcon}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            lastPickedRef.current = "";
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !open && onSubmitFreeText) {
              onSubmitFreeText();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            "w-full bg-transparent text-base text-ocean-deep placeholder:text-muted-foreground focus:outline-none",
            inputClassName,
          )}
        />
        {loading && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(s);
                }}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">
                    {s.primaryText}
                  </span>
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
  );
}

export default LocationAutocomplete;
