import React from "react";
import { Activity, Gauge, TrendingUp, Ban } from "lucide-react";

export default function GlobalTelemetryOverview({ sessions }) {
  const totalStreams = sessions.length;
  const totalBandwidth = sessions.reduce((sum, s) => sum + (s.current_bitrate_mbps || 0), 0);
  const bandwidthGbps = (totalBandwidth / 1000).toFixed(2);
  const directPlayCount = sessions.filter((s) => s.stream_mode === "direct_play").length;
  const directPlayRatio = totalStreams > 0 ? Math.round((directPlayCount / totalStreams) * 100) : 0;
  const blocked4K = sessions.filter((s) => s.resolution?.includes("4K") && s.stream_mode === "transcode").length;

  const cards = [
    { icon: Activity, label: "Total Active Streams", value: totalStreams, color: "text-lime-400", bg: "bg-lime-500/10" },
    { icon: Gauge, label: "Total Bandwidth", value: `${bandwidthGbps} Gbps`, color: "text-sky-400", bg: "bg-sky-500/10" },
    { icon: TrendingUp, label: "Direct Play Ratio", value: `${directPlayRatio}%`, subLabel: "target > 85%", color: directPlayRatio > 85 ? "text-emerald-400" : "text-amber-400", bg: "bg-indigo-500/10" },
    { icon: Ban, label: "Blocked 4K Transcodes", value: blocked4K, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-4">
            <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{c.label}</p>
            {c.subLabel && <p className="text-[10px] text-zinc-600 mt-0.5">{c.subLabel}</p>}
          </div>
        );
      })}
    </div>
  );
}