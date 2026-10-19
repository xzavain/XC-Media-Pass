import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function FinancialTrendChart({ data }) {
  return (
    <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Revenue, Expenses & Profit Trend</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value) => `$${value.toFixed(2)}`}
          />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#a3e635" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f97316" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}