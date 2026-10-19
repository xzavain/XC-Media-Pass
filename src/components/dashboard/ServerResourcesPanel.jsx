import React from "react";
import { Activity, Gauge, Server } from "lucide-react";
import PlatformBadge from "@/components/shared/PlatformBadge";
import moment from "moment";

const APP_NAME = { plex: "Plex Media Server", jellyfin: "Jellyfin Server", emby: "Emby Server" };

export default function ServerResourcesPanel({ servers, sessions }) {
  if (!servers.length) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center">
        <Server className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No servers connected yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800/40">
      {servers.map((server) => {
        const serverSessions = sessions.filter((s) => s.server_id === server.id);
        const bandwidthMbps = serverSessions.reduce((sum, s) => sum + (s.bitrate || 0), 0) / 1000;
        return (
          <div key={server.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <PlatformBadge platform={server.platform} />
            <div className="min-w-0">
              <p className="text-sm text-zinc-200 font-medium truncate">{server.name}</p>
              <p className="text-xs text-zinc-500">{APP_NAME[server.platform]}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 ml-auto">
              <Activity className="w-3.5 h-3.5 text-lime-400" /> {serverSessions.length} active
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Gauge className="w-3.5 h-3.5 text-lime-400" /> {bandwidthMbps.toFixed(1)} Mbps
            </div>
            <span className="text-xs text-zinc-600">
              Users synced {server.users_last_synced ? moment(server.users_last_synced).fromNow() : "never"}
            </span>
          </div>
        );
      })}
    </div>
  );
}