import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { computeMonthlyTrends } from "@/lib/billingCalculations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RevenueTrendChart() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.BillingCustomer.list("-created_date", 500),
      base44.entities.StorePlan.list(),
      base44.entities.BillingExpense.list(),
    ]).then(([customers, plans, expenses]) => {
      setTrends(computeMonthlyTrends(customers, plans, expenses));
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800/60">
        <h2 className="text-sm font-semibold text-zinc-200">Monthly Revenue Trend</h2>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="h-[260px] flex items-center justify-center text-zinc-500 text-sm">Loading revenue data...</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#a3e635" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}