/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface Props {
  address: string | null;
  lat: number | null;
  lng: number | null;
}

declare global {
  interface Window {
    __gmapsLoaderPromise?: Promise<typeof google>;
    __gmapsInitCb?: () => void;
  }
}

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__gmapsLoaderPromise) return window.__gmapsLoaderPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps key missing"));

  window.__gmapsLoaderPromise = new Promise((resolve, reject) => {
    window.__gmapsInitCb = () => resolve(window.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__gmapsInitCb${
      channel ? `&channel=${channel}` : ""
    }`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });

  return window.__gmapsLoaderPromise;
}

export function MeetingPointMap({ address, lat, lng }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return;
        const position = { lat, lng };
        const map = new google.maps.Map(mapRef.current, {
          center: position,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const marker = new google.maps.Marker({
          position,
          map,
          title: "Trip Departure / Meeting Point",
        });
        const info = new google.maps.InfoWindow({
          content:
            '<div style="font-weight:600;font-size:13px;padding:2px 4px;">Trip Departure / Meeting Point</div>',
        });
        info.open({ map, anchor: marker });
        marker.addListener("click", () => info.open({ map, anchor: marker }));
      })
      .catch((e) => console.error("[MeetingPointMap]", e));

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const hasCoords = lat != null && lng != null;

  return (
    <section id="map" className="scroll-mt-24 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Departure &amp; Meeting Point</h2>
          {address ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {address}
            </p>
          ) : null}
        </div>
      </div>

      {hasCoords ? (
        <div
          ref={mapRef}
          className="h-[360px] w-full overflow-hidden rounded-2xl border bg-muted"
          aria-label="Map of trip departure and meeting point"
        />
      ) : (
        <div className="flex h-[200px] w-full items-center justify-center rounded-2xl border bg-muted/40 text-center text-sm text-muted-foreground">
          <div className="px-6">
            <MapPin className="mx-auto mb-2 h-6 w-6" />
            Meeting point not set yet — add a marina, ramp, or address in your
            listing profile to show it here.
          </div>
        </div>
      )}
    </section>
  );
}
