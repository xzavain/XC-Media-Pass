import React from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ArrowRight, ServerCog } from "lucide-react";
import moment from "moment";
import PlatformBadge from "@/components/shared/PlatformBadge";

const STATUS_STYLES = {
  connected: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Connected" },
  error: { dot: "bg-red-400", text: "text-red-300", label: "Error" },
  syncing: { dot: "bg-blue-400", text: "text-blue-300", label: "Syncing" },
  disconnected: { dot: "bg-zinc-500", text: "text-zinc-400", label: "Disconnected" },
};

export default function ServerStatusSummary({ servers = [] }) {
  const connected = servers.filter((s) => s.status === "connected").length;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <ServerCog className="w-4 h-4 text-lime-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Server Status</h2>
          <span className="text-xs text-zinc-500">
            {connected}/{servers.length} connected
          </span>
        </div>
        <Link to="/admin/servers" className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="divide-y divide-zinc-800/40">
        {servers.map((server) => {
          const style = STATUS_STYLES[server.status] || STATUS_STYLES.disconnected;
          const lastSync = server.last_synced
            ? moment(server.last_synced).fromNow()
            : "Never";

          return (
            <div key={server.id} className="flex items-center gap-4 px-5 py-3">
              <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 font-medium truncate">{server.name}</p>
                <p className="text-xs text-zinc-500 truncate">{server.url}</p>
              </div>
              <PlatformBadge platform={server.platform} />
              <span className={`text-xs font-medium ${style.text} w-20 text-right`}>{style.label}</span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 w-28 justify-end">
                <RefreshCw className="w-3 h-3" />
                {lastSync}
              </div>
            </div>
          );
        })}

        {!servers.length && (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">
            No media servers connected yet.
          </div>
        )}
      </div>
    </div>
  );
}