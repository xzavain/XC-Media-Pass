import React from "react";
import { ShieldAlert } from "lucide-react";

// Simple heuristic: flag usernames that streamed from more than one distinct
// IP address on the same calendar day — a common sign of account sharing.
function computeFlags(sessions) {
  const byUserDay = new Map();
  for (const s of sessions) {
    if (!s.started_at || !s.ip_address) continue;
    const day = s.started_at.slice(0, 10);
    const key = `${s.username}__${day}`;
    if (!byUserDay.has(key)) byUserDay.set(key, { username: s.username, day, ips: new Set() });
    byUserDay.get(key).ips.add(s.ip_address);
  }
  return Array.from(byUserDay.values())
    .filter((g) => g.ips.size > 1)
    .map((g) => ({ ...g, ips: Array.from(g.ips) }));
}

export default function SharingFlags({ sessions }) {
  const flags = computeFlags(sessions);

  if (flags.length === 0) {
    return <p className="text-sm text-zinc-500">No suspicious sharing activity detected.</p>;
  }

  return (
    <div className="space-y-2">
      {flags.map((f, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-zinc-300">
            <span className="font-medium">{f.username}</span> streamed from {f.ips.length} different IPs on {f.day}
            <span className="text-zinc-500"> ({f.ips.join(", ")})</span>
          </p>
        </div>
      ))}
    </div>
  );
}