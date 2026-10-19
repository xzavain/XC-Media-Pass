import React from "react";
import { STATUS_COLORS } from "@/lib/billingApi";

export default function SubscriptionTable({ subscriptions, customersById, categoriesById, gatewaysById, plansById }) {
  const fmt = (n, c = "USD") => (n || 0).toLocaleString(undefined, { style: "currency", currency: c });
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium">Customer</th>
            <th className="text-left px-4 py-2.5 font-medium">Plan</th>
            <th className="text-left px-4 py-2.5 font-medium">Raw Name</th>
            <th className="text-left px-4 py-2.5 font-medium">Category</th>
            <th className="text-left px-4 py-2.5 font-medium">Gateway</th>
            <th className="text-left px-4 py-2.5 font-medium">Next Due</th>
            <th className="text-right px-4 py-2.5 font-medium">Amount</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {subscriptions.map((s) => {
            const cust = customersById[s.customer_id];
            const cat = categoriesById[s.category_id];
            const gw = gatewaysById[s.gateway_account_id];
            const plan = plansById[s.plan_id];
            const color = cat?.color_hex || "#64748b";
            return (
              <tr key={s.id} className="hover:bg-slate-900/30">
                <td className="px-4 py-2.5 text-zinc-200">{cust?.name || "—"}<div className="text-xs text-slate-500">{cust?.email || ""}</div></td>
                <td className="px-4 py-2.5 text-zinc-300">{plan?.plan_name || "—"}</td>
                <td className="px-4 py-2.5 text-slate-400">{s.raw_product_name}</td>
                <td className="px-4 py-2.5">{cat ? <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}22`, color }}>{cat.name}</span> : <span className="text-xs text-slate-600">Uncategorized</span>}</td>
                <td className="px-4 py-2.5 text-slate-400 capitalize">{gw?.provider || "—"}</td>
                <td className="px-4 py-2.5 text-slate-400">{fmtDate(s.next_billing_date)}</td>
                <td className="px-4 py-2.5 text-right text-zinc-100 font-medium">{fmt(s.amount, s.currency)}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[s.status] || ""}`}>{s.status}</span></td>
              </tr>
            );
          })}
          {!subscriptions.length && (
            <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No subscriptions found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}