import React from "react";
import StreamSessionCard from "./StreamSessionCard";
import { Loader2, MonitorPlay } from "lucide-react";

export default function ActiveStreamInspector({ sessions, servers, loading, onCopyReport }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
      </div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <MonitorPlay className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active streams detected for your account.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {sessions.map((s) => (
        <StreamSessionCard
          key={s.id}
          session={s}
          server={servers.find((sv) => sv.id === s.server_id)}
          onCopyReport={() => onCopyReport(s)}
        />
      ))}
    </div>
  );
}