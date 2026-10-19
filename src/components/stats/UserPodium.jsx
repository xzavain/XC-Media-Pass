import React from "react";
import { Trophy, Clock, Play, TrendingUp } from "lucide-react";

const RANK_CONFIG = [
  { bg: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/30", text: "text-amber-400", label: "1st" },
  { bg: "from-zinc-400/20 to-zinc-500/5", border: "border-zinc-400/30", text: "text-zinc-300", label: "2nd" },
  { bg: "from-orange-700/20 to-orange-800/5", border: "border-orange-700/30", text: "text-orange-500", label: "3rd" },
];

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export default function UserPodium({ users }) {
  if (users.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
        <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-zinc-300 font-medium">No activity yet</h3>
        <p className="text-sm text-zinc-500 mt-1">User engagement data will appear once streams are recorded</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {users.map((user, i) => {
        const rank = RANK_CONFIG[i] || RANK_CONFIG[2];
        return (
          <div key={user.username} className={`bg-gradient-to-b ${rank.bg} border ${rank.border} rounded-xl p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-100">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{rank.label}</p>
                <p className="text-zinc-100 font-medium truncate">{user.username}</p>
              </div>
              <Trophy className={`w-5 h-5 ${rank.text} ml-auto`} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Clock className={`w-4 h-4 ${rank.text} mx-auto mb-1`} />
                <p className="text-sm font-bold text-zinc-100">{formatHours(user.watchHours)}</p>
                <p className="text-xs text-zinc-500">Watch</p>
              </div>
              <div>
                <Play className={`w-4 h-4 ${rank.text} mx-auto mb-1`} />
                <p className="text-sm font-bold text-zinc-100">{user.playCount}</p>
                <p className="text-xs text-zinc-500">Plays</p>
              </div>
              <div>
                <TrendingUp className={`w-4 h-4 ${rank.text} mx-auto mb-1`} />
                <p className="text-sm font-bold text-zinc-100">{user.transcodeRate.toFixed(0)}%</p>
                <p className="text-xs text-zinc-500">TC Rate</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}