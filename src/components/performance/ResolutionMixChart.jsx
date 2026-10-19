import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = { "4K": "#a3e635", "1080p": "#38bdf8", "720p": "#fbbf24", SD: "#f472b6", other: "#52525b" };

// Resolution mix doughnut (4K, 1080p, 720p, SD).
export default function ResolutionMixChart({ snapshots }) {
  const data = useMemo(() => {
    const totals = { "4K": 0, "1080p": 0, "720p": 0, SD: 0, other: 0 };
    for (const s of snapshots) {
      const bd = s.resolution_breakdown || {};
      for (const k of Object.keys(totals)) totals[k] += bd[k] || 0;
    }
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [snapshots]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Resolution Mix</h3>
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name] || "#52525b"} stroke="#0a0a0a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function EmptyState() {
  return <div className="h-[220px] flex items-center justify-center text-sm text-zinc-500">No resolution data yet.</div>;
}