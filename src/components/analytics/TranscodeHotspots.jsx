import React from "react";
import { Flame } from "lucide-react";

export default function TranscodeHotspots({ sessions }) {
  const groups = {};
  for (const s of sessions) {
    if (s.transcode_decision !== "transcode") continue;
    const key = `${s.device || "Unknown device"} · ${s.source_video_codec || s.video_codec || "Unknown"}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  const rows = Object.entries(groups)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4 text-amber-400" /> Transcode Hotspots
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">No transcoded sessions recorded yet</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{r.label}</span>
              <span className="text-amber-400 font-medium">{r.count} sessions</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}