import React from "react";
import { Activity } from "lucide-react";
import { format } from "date-fns";

export default function CustomerActivityTimeline({ logs }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold text-white">Activity History</h3>
      </div>
      {logs.length === 0 ? (
        <p className="text-xs text-zinc-500">No activity recorded.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-1.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-zinc-200">{log.details}</p>
                <p className="text-[10px] text-zinc-500">{format(new Date(log.created_date), "MMM d, yyyy h:mm a")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}