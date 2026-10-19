import React from "react";

export default function ProfitBadge({ value, size = "sm" }) {
  const rounded = Math.round(value * 100) / 100;
  const color =
    rounded > 0
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : rounded === 0
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20";
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${color} ${sizeClass}`}>
      ${rounded.toFixed(2)}
    </span>
  );
}