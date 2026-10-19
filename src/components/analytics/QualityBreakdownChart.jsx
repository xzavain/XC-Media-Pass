import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { qualityBucket } from "@/lib/qualityBucket";

const ORDER = ["4K", "1080p", "720p", "SD", "Unknown"];
const COLORS = { "4K": "#a3e635", "1080p": "#60a5fa", "720p": "#f59e0b", SD: "#f87171", Unknown: "#71717a" };

export default function QualityBreakdownChart({ sessions }) {
  const counts = {};
  for (const s of sessions) {
    const bucket = qualityBucket(s.source_resolution || s.resolution);
    counts[bucket] = (counts[bucket] || 0) + 1;
  }
  const data = ORDER.filter((k) => counts[k]).map((k) => ({ name: k, count: counts[k] }));

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Quality Breakdown</h3>
      {data.length === 0 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">No playback history yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}