import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function BandwidthTrendChart({ sessions }) {
  const buckets = {};
  for (const s of sessions) {
    if (!s.bitrate || !s.started_at) continue;
    const hour = moment(s.started_at).format("HH:00");
    if (!buckets[hour]) buckets[hour] = { total: 0, count: 0, time: hour, sortKey: moment(s.started_at).startOf("hour").valueOf() };
    buckets[hour].total += s.bitrate;
    buckets[hour].count += 1;
  }
  const data = Object.values(buckets)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((b) => ({ time: b.time, mbps: Math.round((b.total / b.count) / 1000 * 10) / 10 }));

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Bandwidth Throughput (avg Mbps, last 24h)</h3>
      {data.length < 2 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">Not enough data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <XAxis dataKey="time" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} unit=" Mbps" />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
            <Area type="monotone" dataKey="mbps" stroke="#a3e635" fill="#a3e635" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}