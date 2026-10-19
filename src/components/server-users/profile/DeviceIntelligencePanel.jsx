import React from "react";
import { Smartphone, Monitor, Tv, Cast } from "lucide-react";
import moment from "moment";

function deviceIcon(device) {
  const d = (device || "").toLowerCase();
  if (/tv|roku|fire|shield|android tv|tizen|webos/.test(d)) return Tv;
  if (/phone|mobile|ios|android|iphone/.test(d)) return Smartphone;
  if (/cast|chromecast/.test(d)) return Cast;
  return Monitor;
}

// Device Intelligence Panel — hardware/client log for troubleshooting.
export default function DeviceIntelligencePanel({ devices }) {
  if (!devices.length) {
    return <p className="text-sm text-zinc-500 text-center py-4">No device data recorded yet.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {devices.map((d, i) => {
        const Icon = deviceIcon(d.device);
        return (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-lime-400" />
              <span className="font-semibold text-zinc-200 truncate">{d.device}</span>
            </div>
            <dl className="space-y-1 text-xs text-zinc-400">
              <div className="flex justify-between"><dt>Player</dt><dd className="text-zinc-300">{d.player}</dd></div>
              <div className="flex justify-between"><dt>Client</dt><dd className="text-zinc-300">{d.client_app || "—"} {d.client_version}</dd></div>
              <div className="flex justify-between"><dt>Resolution</dt><dd className="text-zinc-300">{d.resolution || "—"}</dd></div>
              <div className="flex justify-between"><dt>Last IP</dt><dd className="text-zinc-300 font-mono">{d.last_ip || "—"}</dd></div>
              <div className="flex justify-between"><dt>Last Seen</dt><dd className="text-zinc-300">{d.last_seen ? moment(d.last_seen).fromNow() : "—"}</dd></div>
              <div className="flex justify-between"><dt>Plays</dt><dd className="text-lime-400 font-semibold">{d.play_count}</dd></div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}