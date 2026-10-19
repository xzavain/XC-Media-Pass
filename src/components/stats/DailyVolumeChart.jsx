import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };

export default function DailyVolumeChart({ data }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Daily Play Volume (30d)</h3>
      {data.length < 2 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">Not enough data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" stroke="#71717a" fontSize={10} interval="preserveStartEnd" />
            <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="plays" stroke="#34d399" fill="url(#dailyGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}