import React from "react";

// Compact metric card with icon, value, and optional sublabel.
export default function MetricCard({ icon: Icon, label, value, sublabel, accent = "text-lime-400" }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
        {Icon && <Icon className={`w-4 h-4 ${accent}`} />} {label}
      </div>
      <div className="text-2xl font-bold text-zinc-100 mt-1">{value}</div>
      {sublabel && <div className="text-xs text-zinc-500 mt-0.5">{sublabel}</div>}
    </div>
  );
}