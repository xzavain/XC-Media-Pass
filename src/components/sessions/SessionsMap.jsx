import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLocation } from "@/lib/geoApi";

// Tracearr-style pulsing active-stream dot (16px) with a glowing core.
const streamIcon = L.divIcon({
  className: "stream-marker-icon",
  html: `<div class="map-stream-dot"><div class="map-stream-dot-core"></div></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

// Auto-fit the map to all stream locations, but stop auto-fitting once the
// user has manually zoomed or panned (Tracearr-style behavior).
function MapBoundsUpdater({ points }) {
  const map = useMap();
  const prevBoundsKeyRef = useRef("");
  const userInteractedRef = useRef(false);
  const isProgrammaticRef = useRef(false);

  const handleUserInteraction = useCallback(() => {
    if (!isProgrammaticRef.current) userInteractedRef.current = true;
  }, []);

  useEffect(() => {
    map.on("zoomstart", handleUserInteraction);
    map.on("dragstart", handleUserInteraction);
    return () => {
      map.off("zoomstart", handleUserInteraction);
      map.off("dragstart", handleUserInteraction);
    };
  }, [map, handleUserInteraction]);

  useEffect(() => {
    const coords = points.filter((p) => p.lat && p.lon).map((p) => [p.lat, p.lon]);
    if (!coords.length) return;
    const boundsKey = coords.map(([lat, lon]) => `${lat.toFixed(4)},${lon.toFixed(4)}`).sort().join("|");
    if (boundsKey === prevBoundsKeyRef.current) return;
    const isInitialLoad = prevBoundsKeyRef.current === "";
    prevBoundsKeyRef.current = boundsKey;
    if (isInitialLoad || !userInteractedRef.current) {
      const bounds = L.latLngBounds(coords);
      isProgrammaticRef.current = true;
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      isProgrammaticRef.current = false;
    }
  }, [points, map]);

  return null;
}

export default function SessionsMap({ sessions }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.all(
        (sessions || []).map(async (s) => {
          const loc = await getLocation(s.ip_address);
          return loc ? { ...loc, session: s } : null;
        })
      );
      if (cancelled) return;
      // Aggregate by location so one pulsing dot represents all streams there.
      const byKey = new Map();
      for (const r of results.filter(Boolean)) {
        const key = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`;
        if (!byKey.has(key)) {
          byKey.set(key, { lat: r.lat, lon: r.lon, city: r.city, country: r.country, count: 0, sessions: [] });
        }
        const p = byKey.get(key);
        p.count += 1;
        p.sessions.push(r.session);
      }
      setPoints(Array.from(byKey.values()));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sessions]);

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800/60 relative" style={{ height: 380 }}>
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_4dg7_1_6b0c72969f916b2212903f92"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <ZoomControl position="bottomright" />
        <MapBoundsUpdater points={points} />
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lon]} icon={streamIcon}>
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-zinc-900">
                  {p.city ? `${p.city}, ` : ""}{p.country}
                </div>
                <div className="text-zinc-600">{p.count} stream{p.count !== 1 ? "s" : ""}</div>
              </div>
            </Tooltip>
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-semibold">{p.city ? `${p.city}, ` : ""}{p.country}</div>
                <div className="text-zinc-600">{p.count} stream{p.count !== 1 ? "s" : ""}:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {p.sessions.slice(0, 8).map((s, j) => (
                    <li key={j}>
                      <span className="font-medium">{s.username}</span> — {s.title}
                    </li>
                  ))}
                  {p.sessions.length > 8 && <li>...and {p.sessions.length - 8} more</li>}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 pointer-events-none">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-lime-500 rounded-full animate-spin" />
        </div>
      )}
      {!loading && !points.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm text-zinc-500">No location data for active streams</span>
        </div>
      )}
    </div>
  );
}