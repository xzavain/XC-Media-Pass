import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };

export default function ConcurrentStreamsChart({ data }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Concurrent Streams (24h)</h3>
      {data.length < 2 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">Not enough data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="concurrentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" stroke="#71717a" fontSize={10} interval="preserveStartEnd" />
            <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="concurrent" stroke="#a3e635" fill="url(#concurrentGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}