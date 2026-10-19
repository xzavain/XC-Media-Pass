import React from "react";
import { Link2, UserPlus, UserMinus, Clock, Server, Shield, XCircle } from "lucide-react";
import moment from "moment";

const iconMap = {
  invite_created: Link2,
  invite_activated: UserPlus,
  trial_extended: Clock,
  trial_expired: XCircle,
  user_removed: UserMinus,
  server_connected: Server,
  server_disconnected: Server,
  invite_revoked: Shield,
};

const colorMap = {
  invite_created: "text-violet-400 bg-violet-500/10",
  invite_activated: "text-emerald-400 bg-emerald-500/10",
  trial_extended: "text-blue-400 bg-blue-500/10",
  trial_expired: "text-amber-400 bg-amber-500/10",
  user_removed: "text-rose-400 bg-rose-500/10",
  server_connected: "text-emerald-400 bg-emerald-500/10",
  server_disconnected: "text-zinc-400 bg-zinc-500/10",
  invite_revoked: "text-rose-400 bg-rose-500/10",
};

export default function RecentActivity({ logs }) {
  if (!logs.length) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map(log => {
        const Icon = iconMap[log.action] || Link2;
        const color = colorMap[log.action] || "text-zinc-400 bg-zinc-500/10";
        return (
          <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/30 transition-colors">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate">{log.details}</p>
              {log.username && <p className="text-xs text-zinc-500">{log.username}</p>}
            </div>
            <span className="text-xs text-zinc-600 flex-shrink-0">
              {moment(log.created_date).fromNow()}
            </span>
          </div>
        );
      })}
    </div>
  );
}