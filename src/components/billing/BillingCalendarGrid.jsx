import React from "react";

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function BillingCalendarGrid({ monthDate, subscriptions, categoriesById, onDateClick, selectedDate }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const weeks = [];
  const cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cur);
      const daySubs = subscriptions.filter((s) => s.next_billing_date && sameDay(new Date(s.next_billing_date), day));
      row.push({ day, subs: daySubs, inMonth: day.getMonth() === month });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(row);
  }

  const totalForDay = (subs) => subs.reduce((sum, s) => sum + (s.amount || 0), 0);
  const fmt = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2 text-xs text-slate-500 text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map(({ day, subs, inMonth }, idx) => {
          const isToday = sameDay(day, today);
          const isSelected = selectedDate && sameDay(day, selectedDate);
          return (
            <div
              key={idx}
              onClick={() => onDateClick(day)}
              className={`min-h-[96px] border-b border-r border-slate-800/60 p-1.5 cursor-pointer hover:bg-slate-900/40 transition-colors ${inMonth ? "" : "bg-slate-950/60"} ${isSelected ? "ring-1 ring-cyan-500/40" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${isToday ? "bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold" : inMonth ? "text-zinc-300" : "text-slate-600"}`}>{day.getDate()}</span>
                {subs.length > 0 && <span className="text-[10px] text-slate-500">{fmt(totalForDay(subs))}</span>}
              </div>
              <div className="space-y-1">
                {subs.slice(0, 3).map((s) => {
                  const cat = categoriesById[s.category_id];
                  const color = cat?.color_hex || "#64748b";
                  return (
                    <div key={s.id} className="flex items-center gap-1 text-[10px] rounded px-1 py-0.5 truncate" style={{ background: `${color}22`, color }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="truncate">{s.raw_product_name}</span>
                    </div>
                  );
                })}
                {subs.length > 3 && (
                  <div className="text-[10px] text-cyan-400 px-1">+{subs.length - 3} renewals · {fmt(totalForDay(subs))}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}