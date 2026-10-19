import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import moment from "moment";

// Time-series throughput graph splitting local (private network) vs remote
// (external) bandwidth, aggregated across all servers per snapshot.
export default function ThroughputChart({ snapshots }) {
  const data = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))
      .map((s) => ({
        time: moment(s.captured_at).format("MMM D, h:mm A"),
        local: Math.round((s.local_bandwidth_kb || 0) / 1024 * 10) / 10,
        remote: Math.round((s.remote_bandwidth_kb || 0) / 1024 * 10) / 10,
        peak: s.peak_bitrate || 0,
      }));
  }, [snapshots]);

  if (!data.length) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 h-[320px] flex items-center justify-center text-sm text-zinc-500">
        No throughput data yet. Press Refresh Analytics to capture.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Throughput — Local vs Remote (MB)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 11 }} interval="preserveStartEnd" minTickGap={30} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#a1a1aa" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
          <Line type="monotone" dataKey="local" name="Local (MB)" stroke="#a3e635" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="remote" name="Remote (MB)" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="peak" name="Peak (kbps)" stroke="#fbbf24" strokeWidth={2} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}