import React from "react";
import { Trophy } from "lucide-react";

export default function UserLeaderboard({ sessions }) {
  const groups = {};
  for (const s of sessions) {
    if (!groups[s.username]) groups[s.username] = { username: s.username, total: 0, transcodes: 0 };
    groups[s.username].total += 1;
    if (s.transcode_decision === "transcode") groups[s.username].transcodes += 1;
  }
  const rows = Object.values(groups)
    .filter((u) => u.transcodes > 0)
    .sort((a, b) => b.transcodes - a.transcodes)
    .slice(0, 6);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-lime-400" /> Transcode Leaderboard
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">No transcoded sessions recorded yet</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((u, i) => (
            <div key={u.username} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 text-zinc-600">#{i + 1}</span>
                <span className="text-zinc-200">{u.username}</span>
              </div>
              <span className="text-zinc-400">{u.transcodes} / {u.total} sessions</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}