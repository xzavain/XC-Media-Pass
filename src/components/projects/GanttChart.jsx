import React, { useMemo } from "react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { Flag, Calendar } from "lucide-react";
import { WORK_PACKAGE_TYPES } from "@/lib/projectUtils";

export default function GanttChart({ tasks, onTaskClick }) {
  const { scheduled, unscheduled, rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const sched = tasks.filter((t) => t.start_date && t.due_date);
    const unsched = tasks.filter((t) => !(t.start_date && t.due_date));
    if (sched.length === 0) return { scheduled: [], unscheduled: unsched, rangeStart: null, rangeEnd: null, totalDays: 0 };
    const dates = sched.flatMap((t) => [parseISO(t.start_date), parseISO(t.due_date)]);
    let minD = dates[0], maxD = dates[0];
    dates.forEach((d) => { if (d < minD) minD = d; if (d > maxD) maxD = d; });
    minD = addDays(minD, -2);
    maxD = addDays(maxD, 2);
    return { scheduled: sched, unscheduled: unsched, rangeStart: minD, rangeEnd: maxD, totalDays: differenceInDays(maxD, minD) || 1 };
  }, [tasks]);

  const monthMarkers = useMemo(() => {
    if (!rangeStart) return [];
    const markers = [];
    let d = new Date(rangeStart);
    d.setDate(1);
    while (d <= rangeEnd) {
      const offset = differenceInDays(d, rangeStart);
      if (offset >= 0) markers.push({ date: new Date(d), left: (offset / totalDays) * 100 });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return markers;
  }, [rangeStart, rangeEnd, totalDays]);

  if (scheduled.length === 0 && unscheduled.length === 0) {
    return <div className="text-center py-12 text-sm text-zinc-500">No tasks to display. Create tasks with start and due dates to see them on the timeline.</div>;
  }

  return (
    <div className="space-y-4">
      {scheduled.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
          <div className="flex">
            <div className="w-56 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-900/60">
              <div className="h-10 px-3 flex items-center text-xs font-semibold text-zinc-400 uppercase tracking-wide border-b border-zinc-800/60">Task</div>
              {scheduled.map((t) => {
                const cfg = WORK_PACKAGE_TYPES[t.work_package_type] || WORK_PACKAGE_TYPES.task;
                return (
                  <div key={t.id} className="h-9 px-3 flex items-center gap-2 border-b border-zinc-800/40 hover:bg-zinc-800/30 cursor-pointer" onClick={() => onTaskClick?.(t)}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="text-xs text-zinc-200 truncate">{t.title}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="relative h-10 border-b border-zinc-800/60 bg-zinc-900/60">
                {monthMarkers.map((m, i) => (
                  <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${m.left}%` }}>
                    <div className="border-l border-zinc-700/50 h-full" />
                    <span className="text-xs text-zinc-500 px-1.5">{format(m.date, "MMM")}</span>
                  </div>
                ))}
              </div>
              <div className="relative">
                {scheduled.map((t) => {
                  const start = parseISO(t.start_date);
                  const end = parseISO(t.due_date);
                  const left = (differenceInDays(start, rangeStart) / totalDays) * 100;
                  const width = Math.max((differenceInDays(end, start) + 1) / totalDays * 100, 1.5);
                  const cfg = WORK_PACKAGE_TYPES[t.work_package_type] || WORK_PACKAGE_TYPES.task;
                  const isMilestone = t.work_package_type === "milestone";
                  return (
                    <div key={t.id} className="h-9 border-b border-zinc-800/40 relative hover:bg-zinc-800/20" onClick={() => onTaskClick?.(t)}>
                      {isMilestone ? (
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-amber-500 cursor-pointer" style={{ left: `${left + width / 2}%` }} />
                      ) : (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 h-5 rounded ${cfg.dot} opacity-80 hover:opacity-100 cursor-pointer flex items-center px-1.5 overflow-hidden`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          {width > 8 && <span className="text-xs text-white truncate">{t.title}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {unscheduled.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
            <Calendar className="w-4 h-4" /> Unscheduled ({unscheduled.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => {
              const cfg = WORK_PACKAGE_TYPES[t.work_package_type] || WORK_PACKAGE_TYPES.task;
              return (
                <button
                  key={t.id}
                  onClick={() => onTaskClick?.(t)}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}