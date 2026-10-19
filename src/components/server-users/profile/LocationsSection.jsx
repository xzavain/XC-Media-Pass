import React from "react";
import { MapPin, Globe } from "lucide-react";
import ProfileMap from "./ProfileMap";
import moment from "moment";

// Locations of Use — geographic mapping and IP log with ASN, country, postal.
export default function LocationsSection({ locations }) {
  return (
    <div className="space-y-4">
      <ProfileMap locations={locations} />
      {locations.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">No geolocated stream sources yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-4">IP Address</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">ASN / Org</th>
                <th className="py-2 pr-4">Postal</th>
                <th className="py-2 pr-4 text-right">Plays</th>
                <th className="py-2 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.ip} className="border-b border-zinc-800/50 text-zinc-300">
                  <td className="py-2 pr-4 font-mono text-xs">{l.ip}</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-lime-400" />
                      {l.geo.city ? `${l.geo.city}, ` : ""}{l.geo.country}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-zinc-400">
                    {l.geo.asn ? <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{l.geo.asn}</span> : "—"}
                    {l.geo.org && <div className="text-xs text-zinc-500">{l.geo.org}</div>}
                  </td>
                  <td className="py-2 pr-4 text-zinc-400">{l.geo.postal || "—"}</td>
                  <td className="py-2 pr-4 text-right">{l.play_count}</td>
                  <td className="py-2 text-right text-zinc-500">{l.last_seen ? moment(l.last_seen).fromNow() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}