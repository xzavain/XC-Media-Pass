import React from "react";

export default function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-2xl font-heading font-bold text-zinc-100">{value}</p>
    </div>
  );
}