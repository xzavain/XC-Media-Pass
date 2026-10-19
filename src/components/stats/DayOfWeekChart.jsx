import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };

export default function DayOfWeekChart({ data }) {
  const max = Math.max(...data.map((d) => d.plays), 1);
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Activity by Day of Week</h3>
      {max === 1 && data.every((d) => d.plays === 0) ? (
        <p className="text-sm text-zinc-500 py-10 text-center">No playback history yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="plays" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.day} fill={d.plays === max ? "#a3e635" : "#52525b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}