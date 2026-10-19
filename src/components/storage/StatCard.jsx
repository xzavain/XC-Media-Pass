import React from "react";

export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-zinc-600" />}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}