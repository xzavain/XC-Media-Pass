import React from "react";
import { CalendarDays, CalendarRange, CalendarClock, TrendingUp } from "lucide-react";

export default function RevenueIntakeBar({ daily, weekly, monthly, realizationRate }) {
  const cards = [
    { label: "Daily Intake", value: daily, icon: CalendarDays, color: "text-cyan-400" },
    { label: "Weekly Intake", value: weekly, icon: CalendarRange, color: "text-emerald-400" },
    { label: "Monthly Intake / MRR", value: monthly, icon: CalendarClock, color: "text-violet-400" },
    { label: "Realization Rate", value: realizationRate != null ? `${realizationRate}%` : "—", icon: TrendingUp, color: "text-amber-400" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <c.icon className={`w-3.5 h-3.5 ${c.color}`} /> {c.label}
          </div>
          <p className="text-xl font-semibold text-zinc-100 mt-2">{c.value}</p>
        </div>
      ))}
    </div>
  );
}