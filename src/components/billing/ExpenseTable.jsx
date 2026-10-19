import React from "react";
import { getActiveCustomersInScope } from "@/lib/billingCalculations";

export default function ExpenseTable({ expenses, customers, plans }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-xs text-zinc-500 uppercase">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold">Name</th>
            <th className="text-left px-4 py-2.5 font-semibold">Type</th>
            <th className="text-left px-4 py-2.5 font-semibold">Scope</th>
            <th className="text-left px-4 py-2.5 font-semibold">Cost</th>
            <th className="text-left px-4 py-2.5 font-semibold">Active Users in Scope</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {expenses.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-xs">No expenses yet.</td></tr>
          ) : (
            expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 text-zinc-200">{e.name}</td>
                <td className="px-4 py-2.5 text-zinc-400 capitalize">{e.expense_type.replace(/_/g, " ")}</td>
                <td className="px-4 py-2.5 text-zinc-400">{e.expense_type === "processor_fee" ? e.payment_method : e.scope}</td>
                <td className="px-4 py-2.5 text-zinc-300">
                  {e.expense_type === "processor_fee" ? `${e.fee_percent}% + $${e.fee_fixed}` : `$${(e.monthly_cost || 0).toFixed(2)}`}
                </td>
                <td className="px-4 py-2.5 text-zinc-400">
                  {e.expense_type === "processor_fee" ? "—" : getActiveCustomersInScope(customers, plans, e.scope).length}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}