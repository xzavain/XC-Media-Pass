import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import moment from "moment";

// Interactive area chart of concurrent streams over time, aggregated across
// all servers per snapshot. Gradient fill under the line.
export default function ConcurrentStreamsChart({ snapshots }) {
  const data = useMemo(() => {
    return [...snapshots]
      .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))
      .map((s) => ({
        time: moment(s.captured_at).format("MMM D, h:mm A"),
        streams: s.concurrent_streams || 0,
        captured_at: s.captured_at,
      }));
  }, [snapshots]);

  if (!data.length) {
    return <EmptyState />;
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Concurrent Streams Over Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="streamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 11 }} interval="preserveStartEnd" minTickGap={30} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Area type="monotone" dataKey="streams" stroke="#a3e635" strokeWidth={2} fill="url(#streamGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 h-[300px] flex items-center justify-center text-sm text-zinc-500">
      No snapshot data yet. Press Refresh Analytics to capture.
    </div>
  );
}