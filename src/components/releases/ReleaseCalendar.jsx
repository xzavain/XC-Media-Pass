import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCalendarDays, formatDateKey, daysUntil } from "@/lib/releaseApi";
import { posterUrl } from "@/lib/releaseApi";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ReleaseCalendar({ releases, onSelectRelease }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const days = getCalendarDays(year, month);

  // Map releases by date
  const byDate = {};
  releases.forEach((r) => {
    [
      { date: r.theatrical_release_date, type: "theatrical" },
      { date: r.digital_vod_release_date, type: "vod" },
      { date: r.estimated_server_arrival_date, type: "server" },
    ].forEach(({ date, type }) => {
      if (!date) return;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push({ release: r, type });
    });
  });

  const typeStyles = {
    theatrical: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    vod: "bg-purple-500/20 border-purple-500/40 text-purple-300",
    server: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  };

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{MONTHS[month]} {year}</h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="text-xs text-slate-500 text-center py-1 font-medium">{d}</div>
        ))}
        {days.map((day, i) => {
          const key = formatDateKey(day.date);
          const items = byDate[key] || [];
          const isToday = formatDateKey(now) === key;
          return (
            <div
              key={i}
              className={`min-h-24 border rounded-lg p-1 ${day.isCurrentMonth ? "border-slate-800/60 bg-slate-900/30" : "border-slate-900/30 bg-slate-950/40 opacity-40"}`}
            >
              <span className={`text-xs block text-center mb-1 ${isToday ? "bg-indigo-600 text-white rounded-full w-5 h-5 leading-5 mx-auto" : "text-slate-400"}`}>
                {day.date.getDate()}
              </span>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectRelease(item.release)}
                    className={`block w-full text-left text-[10px] truncate px-1 py-0.5 rounded border ${typeStyles[item.type]}`}
                    title={item.release.title}
                  >
                    {item.release.title}
                  </button>
                ))}
                {items.length > 3 && <p className="text-[10px] text-slate-500 text-center">+{items.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Digital VOD</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Theatrical</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Live on Server</span>
      </div>
    </div>
  );
}