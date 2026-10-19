import React from "react";
import { Wallet } from "lucide-react";
import { format } from "date-fns";

export default function CustomerBillingCard({ customer, planName }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold text-white">Billing</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-zinc-500">Plan</p>
          <p className="text-white">{planName || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Status</p>
          <p className="text-white">{customer.status}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Price</p>
          <p className="text-white">${customer.billed_price?.toFixed(2) ?? "0.00"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Payment Method</p>
          <p className="text-white">{customer.payment_method || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Next Bill Date</p>
          <p className="text-white">{customer.bill_date ? format(new Date(customer.bill_date), "MMM d, yyyy") : "—"}</p>
        </div>
      </div>
    </div>
  );
}