import React, { useState } from "react";
import { Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_STYLES = {
  success: "bg-lime-500/10 text-lime-400",
  failed: "bg-red-500/10 text-red-400",
  refunded: "bg-amber-500/10 text-amber-400",
  pending: "bg-blue-500/10 text-blue-400",
  disputed: "bg-orange-500/10 text-orange-400",
};

export default function PortalPaymentHistory({ payments }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800/60 flex items-center gap-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-lime-400" /> Billing History
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 w-32 text-xs bg-zinc-950/50 ml-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/40 border-b border-zinc-800/60 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Date</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Amount</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Processor</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Status</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">No payment history</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800/40">
                  <td className="px-3 py-2 text-zinc-300 text-xs">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2 text-zinc-100 font-medium">${p.amount?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-zinc-300 capitalize">{p.processor}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] || "bg-zinc-700 text-zinc-300"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 font-mono text-xs truncate max-w-[120px]">{p.transaction_id || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}