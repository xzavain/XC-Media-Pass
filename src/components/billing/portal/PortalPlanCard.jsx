import React from "react";
import { CreditCard, Calendar, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const STATUS_STYLES = {
  ACTIVE: "bg-lime-500/10 text-lime-400 border-lime-500/20",
  INACTIVE: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  CANCELED: "bg-red-500/10 text-red-400 border-red-500/20",
  PENDING_MIGRATION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function PortalPlanCard({ customer, plan, addons }) {
  const addonNames = addons.filter((a) => customer.addon_product_ids?.includes(a.id)).map((a) => a.name);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-lime-400" /> Current Subscription
        </h3>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[customer.status] || STATUS_STYLES.ACTIVE}`}>
          {customer.status}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Plan</span>
          <span className="text-sm text-zinc-100 font-medium">{plan?.name || "No plan assigned"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Price</span>
          <span className="text-sm text-zinc-100 font-medium">${customer.billed_price?.toFixed(2) || "0.00"} <span className="text-zinc-500">/ {customer.billing_cycle || "monthly"}</span></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Next Bill Date</span>
          <span className="text-sm text-zinc-100">{customer.bill_date ? new Date(customer.bill_date).toLocaleDateString() : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Payment Method</span>
          <span className="text-sm text-zinc-100">{customer.payment_method}</span>
        </div>
        {customer.source && customer.source !== "direct" && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Migrated From</span>
            <span className="text-sm text-zinc-100 capitalize">{customer.source}</span>
          </div>
        )}
        {addonNames.length > 0 && (
          <div className="pt-3 border-t border-zinc-800/60">
            <p className="text-sm text-zinc-500 mb-1.5">Active Add-ons</p>
            <div className="flex flex-wrap gap-1.5">
              {addonNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 rounded-md bg-lime-500/10 text-lime-400 border border-lime-500/20 px-2 py-0.5 text-xs">
                  <CheckCircle className="w-3 h-3" /> {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}