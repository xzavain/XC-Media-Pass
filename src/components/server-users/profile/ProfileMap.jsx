import React from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Compact dark-themed map showing stream origin locations for a single user.
// Uses vector CircleMarkers (no external icon assets) with a lime pulse.
export default function ProfileMap({ locations = [] }) {
  const points = locations.filter((l) => l.geo && l.geo.lat != null);
  if (!points.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-zinc-500 border border-zinc-800 rounded-lg bg-zinc-900/30">
        No location data available
      </div>
    );
  }
  const lats = points.map((p) => p.geo.lat);
  const lons = points.map((p) => p.geo.lon);
  const center = [
    lats.reduce((a, b) => a + b, 0) / lats.length,
    lons.reduce((a, b) => a + b, 0) / lons.length,
  ];
  const maxDist = Math.max(
    ...points.map((p) => Math.hypot(p.geo.lat - center[0], p.geo.lon - center[1]))
  );
  const zoom = maxDist > 40 ? 2 : maxDist > 10 ? 4 : maxDist > 2 ? 6 : 8;

  return (
    <div className="h-64 rounded-lg overflow-hidden border border-zinc-800">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%", background: "#0a0a0a" }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        {points.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.geo.lat, p.geo.lon]}
            radius={8}
            pathOptions={{ color: "#a3e635", fillColor: "#a3e635", fillOpacity: 0.6 }}
          >
            <Tooltip direction="top">
              <div className="text-xs">
                <div className="font-semibold">{p.geo.city}, {p.geo.country}</div>
                <div className="text-zinc-400">{p.ip} · {p.play_count} plays</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}