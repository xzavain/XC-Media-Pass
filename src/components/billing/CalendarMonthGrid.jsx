import React from "react";
import moment from "moment";

export default function CalendarMonthGrid({ monthMoment, eventsByDay }) {
  const startOfMonth = monthMoment.clone().startOf("month");
  const endOfMonth = monthMoment.clone().endOf("month");
  const startOfGrid = startOfMonth.clone().startOf("week");
  const endOfGrid = endOfMonth.clone().endOf("week");

  const days = [];
  const cursor = startOfGrid.clone();
  while (cursor.isSameOrBefore(endOfGrid, "day")) {
    days.push(cursor.clone());
    cursor.add(1, "day");
  }

  const today = moment();

  return (
    <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
      <div className="grid grid-cols-7 bg-zinc-900/60 text-xs text-zinc-500 uppercase">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = day.format("YYYY-MM-DD");
          const dayEvents = eventsByDay[key] || [];
          const inMonth = day.isSame(monthMoment, "month");
          const isToday = day.isSame(today, "day");
          const dayTotal = dayEvents.reduce((s, e) => s + e.customer.billed_price, 0);

          return (
            <div
              key={key}
              className={`min-h-[100px] border-t border-l border-zinc-800/40 p-1.5 ${inMonth ? "bg-zinc-950/40" : "bg-zinc-950/10"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${isToday ? "text-lime-400 font-bold" : inMonth ? "text-zinc-400" : "text-zinc-700"}`}>
                  {day.format("D")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-lime-400">${dayTotal.toFixed(0)}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <div
                    key={i}
                    title={`${ev.customer.user_name} — ${ev.plan?.plan_name || "Unknown plan"} — $${ev.customer.billed_price.toFixed(2)}`}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-lime-500/10 text-lime-400 border border-lime-500/20 truncate cursor-default"
                  >
                    {ev.customer.user_name}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-zinc-500">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}