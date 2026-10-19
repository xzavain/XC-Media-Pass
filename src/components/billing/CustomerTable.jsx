import React from "react";
import moment from "moment";
import ProfitBadge from "@/components/billing/ProfitBadge";
import { computeCustomerBilling } from "@/lib/billingCalculations";

export default function CustomerTable({ customers, plans, expenses, onEdit }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-xs text-zinc-500 uppercase">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold">Customer</th>
            <th className="text-left px-4 py-2.5 font-semibold">Plan</th>
            <th className="text-left px-4 py-2.5 font-semibold">Bill Date</th>
            <th className="text-left px-4 py-2.5 font-semibold">Status</th>
            <th className="text-left px-4 py-2.5 font-semibold">Billed</th>
            <th className="text-left px-4 py-2.5 font-semibold">Fee</th>
            <th className="text-left px-4 py-2.5 font-semibold">Net</th>
            <th className="text-left px-4 py-2.5 font-semibold">Allocated Cost</th>
            <th className="text-left px-4 py-2.5 font-semibold">Final Profit</th>
            <th className="text-left px-4 py-2.5 font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {customers.length === 0 ? (
            <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-600 text-xs">No customers yet.</td></tr>
          ) : (
            customers.map((c) => {
              const r = computeCustomerBilling(c, customers, plans, expenses);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 text-zinc-200">
                    {c.user_name}
                    <div className="text-xs text-zinc-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{r.plan?.name || "—"}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{moment(c.bill_date).format("MMM D, YYYY")}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{c.status}</td>
                  <td className="px-4 py-2.5 text-zinc-300">${c.billed_price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-zinc-400">${r.processorFee.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-zinc-400">${r.netRevenue.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-zinc-400">${r.allocatedCost.toFixed(2)}</td>
                  <td className="px-4 py-2.5"><ProfitBadge value={r.finalProfit} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => onEdit(c)} className="text-xs text-lime-400 hover:text-lime-300 font-medium">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}