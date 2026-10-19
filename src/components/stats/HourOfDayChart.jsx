import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };

export default function HourOfDayChart({ data }) {
  const max = Math.max(...data.map((d) => d.plays), 1);
  const hasData = data.some((d) => d.plays > 0);
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Peak Usage Hours</h3>
      {!hasData ? (
        <p className="text-sm text-zinc-500 py-10 text-center">No playback history yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="hour" stroke="#71717a" fontSize={9} interval={2} />
            <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="plays" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.hour} fill={d.plays === max ? "#f59e0b" : "#52525b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}