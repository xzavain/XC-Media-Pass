import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

// Bar chart of per-stream peak bitrates from the latest device telemetry,
// making bandwidth anomalies and bottlenecks easy to spot.
export default function StreamBitrateDistribution({ devices }) {
  const data = useMemo(() => {
    return devices
      .filter((d) => d.bitrate > 0)
      .sort((a, b) => b.bitrate - a.bitrate)
      .slice(0, 15)
      .map((d) => ({
        name: (d.device || "?").slice(0, 14),
        bitrate: d.bitrate,
        user: d.username,
      }));
  }, [devices]);

  if (!data.length) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 h-[300px] flex items-center justify-center text-sm text-zinc-500">
        No stream bitrate data yet.
      </div>
    );
  }

  const maxBw = Math.max(...data.map((d) => d.bitrate));

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Stream Bitrate Distribution (top 15, kbps)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} angle={-35} textAnchor="end" height={50} interval={0} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`${v} kbps`, "Bitrate"]}
          />
          <Bar dataKey="bitrate" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.bitrate > maxBw * 0.8 ? "#f87171" : d.bitrate > maxBw * 0.5 ? "#fbbf24" : "#a3e635"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-zinc-600 mt-2">Red bars flag streams near peak bandwidth (potential bottlenecks).</p>
    </div>
  );
}