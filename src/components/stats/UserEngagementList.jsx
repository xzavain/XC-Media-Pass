import React from "react";
import { Link } from "react-router-dom";
import { Clock, Play, Monitor, Film, Calendar, ExternalLink } from "lucide-react";
import CodecBadge from "./CodecBadge";
import moment from "moment";

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

const MEDIA_LABELS = { movie: "Movies", tv: "TV Shows", music: "Music" };

export default function UserEngagementList({ users, serverUserMap }) {
  if (users.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
        <p className="text-sm text-zinc-500">No user engagement data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user, i) => {
        const serverUserId = serverUserMap[user.username?.toLowerCase()];
        return (
          <div key={user.username} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
                <span className="w-6 text-zinc-500 font-semibold text-sm">#{i + 1}</span>
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-100">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-zinc-100 font-medium truncate">{user.username}</p>
                  <p className="text-xs text-zinc-500">Last seen {user.lastSeen ? moment(user.lastSeen).fromNow() : "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-1 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-lime-400 flex-shrink-0" />
                  <div><p className="text-zinc-100 font-medium">{formatHours(user.watchHours)}</p><p className="text-xs text-zinc-500">Watch</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div><p className="text-zinc-100 font-medium">{user.playCount}</p><p className="text-xs text-zinc-500">Plays</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div><p className="text-zinc-200 text-xs truncate max-w-[100px]">{user.topClient}</p><p className="text-xs text-zinc-500">Client</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div><p className="text-zinc-200 text-xs truncate max-w-[100px]">{MEDIA_LABELS[user.topMediaType] || user.topMediaType}</p><p className="text-xs text-zinc-500">Top Type</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div><p className="text-zinc-100 font-medium">{user.peakHourLabel}</p><p className="text-xs text-zinc-500">Peak Hour</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0"><CodecBadge codec={user.topCodec} /></div>
                  <div><p className="text-xs text-zinc-500">Top Codec</p></div>
                </div>
              </div>

              {serverUserId && (
                <Link
                  to={`/server-users/${serverUserId}`}
                  className="flex items-center gap-1.5 text-xs text-lime-400 hover:text-lime-300 transition-colors flex-shrink-0"
                >
                  Manage <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Transcode rate progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-20">Transcode Rate</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${user.transcodeRate > 50 ? "bg-amber-500" : user.transcodeRate > 25 ? "bg-yellow-500" : "bg-lime-500"}`}
                  style={{ width: `${Math.min(user.transcodeRate, 100)}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 w-10 text-right">{user.transcodeRate.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}