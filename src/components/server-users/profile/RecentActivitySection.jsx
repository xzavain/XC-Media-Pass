import React from "react";
import { Play, Pause, Loader } from "lucide-react";
import moment from "moment";

function StateBadge({ state }) {
  const map = {
    playing: { icon: Play, cls: "bg-lime-500/10 text-lime-400" },
    paused: { icon: Pause, cls: "bg-amber-500/10 text-amber-400" },
    buffering: { icon: Loader, cls: "bg-sky-500/10 text-sky-400" },
  };
  const m = map[state] || map.playing;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${m.cls}`}>
      <Icon className="w-3 h-3" /> {state || "playing"}
    </span>
  );
}

// Recent Activity & History — chronological log of recent streams.
export default function RecentActivitySection({ recent }) {
  if (!recent.length) {
    return <p className="text-sm text-zinc-500 text-center py-4">No recent activity.</p>;
  }
  return (
    <div className="space-y-2">
      {recent.map((s) => (
        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-200 truncate">{s.title}</div>
            <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
              <span>{s.server_name}</span>
              {s.transcode_decision && (
                <span className={s.transcode_decision === "transcode" ? "text-amber-400" : "text-lime-400"}>
                  · {s.transcode_decision}
                </span>
              )}
              {s.resolution && <span>· {s.resolution}</span>}
            </div>
          </div>
          <StateBadge state={s.state} />
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-zinc-400">{s.started_at ? moment(s.started_at).format("MMM D, h:mm A") : "—"}</div>
            {s.progress_percent != null && <div className="text-xs text-zinc-600">{Math.round(s.progress_percent)}%</div>}
          </div>
        </div>
      ))}
    </div>
  );
}