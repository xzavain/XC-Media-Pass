import React from "react";
import PlatformBadge from "@/components/shared/PlatformBadge";
import SessionCard from "@/components/sessions/SessionCard";

export default function GroupedSessions({ sessions, serversById, onKilled, emptyMessage, gridClassName = "sm:grid-cols-2 lg:grid-cols-3", selectable, selectedKeys, onToggleSelect }) {
  if (!sessions.length) {
    return (
      <p className="text-sm text-zinc-500 text-center py-8 border border-dashed border-zinc-800 rounded-xl">
        {emptyMessage}
      </p>
    );
  }

  const groups = {};
  for (const s of sessions) {
    if (!groups[s.server_id]) groups[s.server_id] = [];
    groups[s.server_id].push(s);
  }

  return (
    <div className="space-y-6">
      {Object.values(groups).map((group) => (
        <div key={group[0].server_id}>
          <div className="flex items-center gap-2 mb-3">
            <PlatformBadge platform={group[0].platform} />
            <h3 className="text-sm font-semibold text-zinc-300">{group[0].server_name}</h3>
            <span className="text-xs text-zinc-600">({group.length} stream{group.length !== 1 ? "s" : ""})</span>
          </div>
          <div className={`grid grid-cols-1 gap-4 ${gridClassName}`}>
            {group.map((s) => {
              const key = `${s.server_id}-${s.session_key}`;
              return (
                <SessionCard
                  key={key}
                  session={s}
                  server={serversById[s.server_id]}
                  onKilled={onKilled}
                  selectable={selectable}
                  selected={selectedKeys?.has(key)}
                  onToggleSelect={() => onToggleSelect?.(key, s, serversById[s.server_id])}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}