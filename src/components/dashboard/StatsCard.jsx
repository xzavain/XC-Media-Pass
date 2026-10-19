import React from "react";

export default function StatsCard({ icon: Icon, label, value, trend, color = "violet" }) {
  const colorMap = {
    violet: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
    rose: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  };

  const c = colorMap[color] || colorMap.violet;

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 ${c}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="text-3xl font-heading font-bold text-zinc-100">{value}</div>
      {trend && <p className="text-xs text-zinc-500 mt-1">{trend}</p>}
    </div>
  );
}