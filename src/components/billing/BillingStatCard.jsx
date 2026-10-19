import React from "react";

export default function BillingStatCard({ label, value, icon: Icon, tone = "default" }) {
  const toneClass =
    tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : "text-zinc-100";

  return (
    <div className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-zinc-600" />}
      </div>
      <p className={`text-xl font-heading font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}