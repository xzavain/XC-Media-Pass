import React from "react";
import { Clock, Radio, Users, Gauge, HardDrive } from "lucide-react";

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 1000) return `${h.toFixed(1)}h`;
  return `${(h / 1000).toFixed(1)}k h`;
}

function formatGb(gb) {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  return `${(gb / 1024).toFixed(1)} TB`;
}

export default function StatsMetricBar({ metrics }) {
  const cards = [
    { icon: Clock, label: "Total Watch Time", value: formatHours(metrics.totalWatchHours), color: "text-lime-400" },
    { icon: Radio, label: "Active Streams", value: metrics.activeStreams, color: "text-emerald-400" },
    { icon: Users, label: "Active Users", value: metrics.activeUsers, color: "text-blue-400" },
    { icon: Gauge, label: "Avg Bitrate", value: `${Math.round((metrics.avgBitrate / 1000) * 10) / 10} Mbps`, color: "text-amber-400" },
    { icon: HardDrive, label: "Total Bandwidth", value: formatGb(metrics.totalBandwidthGb), color: "text-purple-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
            <c.icon className={`w-3.5 h-3.5 ${c.color}`} /> {c.label}
          </div>
          <p className="text-2xl font-heading font-bold text-zinc-100">{c.value}</p>
        </div>
      ))}
    </div>
  );
}