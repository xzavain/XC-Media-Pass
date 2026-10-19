import React from "react";

export default function CompatibilityMatrix({ sessions }) {
  const groups = {};
  for (const s of sessions) {
    const device = s.device || "Unknown device";
    const codec = s.source_video_codec || s.video_codec || "Unknown";
    const key = `${device}|${codec}`;
    if (!groups[key]) groups[key] = { device, codec, total: 0, direct: 0, transcode: 0 };
    groups[key].total += 1;
    if (s.transcode_decision === "transcode") groups[key].transcode += 1;
    else groups[key].direct += 1;
  }
  const rows = Object.values(groups).sort((a, b) => b.total - a.total).slice(0, 10);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Compatibility Matrix</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">No playback history yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-4 font-medium">Device</th>
                <th className="py-2 pr-4 font-medium">Codec</th>
                <th className="py-2 pr-4 font-medium">Sessions</th>
                <th className="py-2 pr-4 font-medium">Direct Play</th>
                <th className="py-2 font-medium">Transcode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const directPct = Math.round((r.direct / r.total) * 100);
                return (
                  <tr key={`${r.device}-${r.codec}`} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 text-zinc-200">{r.device}</td>
                    <td className="py-2 pr-4 text-zinc-400">{r.codec}</td>
                    <td className="py-2 pr-4 text-zinc-400">{r.total}</td>
                    <td className="py-2 pr-4 text-lime-400">{directPct}%</td>
                    <td className="py-2 text-amber-400">{100 - directPct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}