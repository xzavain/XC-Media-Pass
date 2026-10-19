import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function CategoryDonut({ data }) {
  const fmt = (v) => (v || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
  if (!data || !data.length) return <div className="h-64 flex items-center justify-center text-sm text-slate-500">No data</div>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e4e4e7" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}