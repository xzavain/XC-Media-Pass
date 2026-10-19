import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, ArrowLeft, Loader2, Clock, HardDrive, Crown, TrendingUp } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import { computeGlobalMetrics, computeUserStats } from "@/lib/statsAggregation";
import StatsMetricBar from "@/components/stats/StatsMetricBar";

const RANK_STYLES = [
  { ring: "ring-amber-500/40", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "1st" },
  { ring: "ring-zinc-400/40", badge: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30", label: "2nd" },
  { ring: "ring-orange-700/40", badge: "bg-orange-700/20 text-orange-500 border-orange-700/30", label: "3rd" },
];

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${Math.round(h)}h`;
}

function formatBandwidth(gb) {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`;
  if (gb < 100) return `${gb.toFixed(1)} GB`;
  return `${Math.round(gb)} GB`;
}

export default function StatsLeaderboard() {
  const { sessions, serverUsers, loading } = useStatsData();
  const [metric, setMetric] = useState("watchHours");

  const metrics = useMemo(() => computeGlobalMetrics(sessions), [sessions]);
  const allUsers = useMemo(() => computeUserStats(sessions), [sessions]);

  const ranked = useMemo(() => {
    const sorted = [...allUsers].sort((a, b) =>
      metric === "watchHours" ? b.watchHours - a.watchHours : b.bandwidthGb - a.bandwidthGb
    );
    const maxVal = sorted.length > 0
      ? metric === "watchHours" ? sorted[0].watchHours : sorted[0].bandwidthGb
      : 1;
    return sorted.map((u, i) => ({
      ...u,
      rank: i + 1,
      value: metric === "watchHours" ? u.watchHours : u.bandwidthGb,
      pct: maxVal > 0 ? (metric === "watchHours" ? u.watchHours : u.bandwidthGb) / maxVal * 100 : 0,
    }));
  }, [allUsers, metric]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const serverUserMap = useMemo(() => {
    const map = {};
    for (const su of serverUsers) {
      if (su.username) map[su.username.toLowerCase()] = su.id;
      if (su.email) map[su.email.toLowerCase()] = su.id;
    }
    return map;
  }, [serverUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
      </div>
    );
  }

  const metricLabel = metric === "watchHours" ? "Stream Time" : "Bandwidth";
  const formatVal = metric === "watchHours" ? formatHours : formatBandwidth;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/stats" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2">
            <ArrowLeft className="w-3 h-3" /> Stats Center
          </Link>
          <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-lime-400" /> Leaderboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Rank users by total stream time and bandwidth usage</p>
        </div>

        <div className="inline-flex rounded-lg bg-zinc-900/60 border border-zinc-800/60 p-1">
          <button
            onClick={() => setMetric("watchHours")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              metric === "watchHours" ? "bg-lime-500/20 text-lime-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="w-4 h-4" /> Stream Time
          </button>
          <button
            onClick={() => setMetric("bandwidthGb")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              metric === "bandwidthGb" ? "bg-lime-500/20 text-lime-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <HardDrive className="w-4 h-4" /> Bandwidth
          </button>
        </div>
      </div>

      <StatsMetricBar metrics={metrics} />

      {ranked.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
          <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-300 font-medium">No activity yet</h3>
          <p className="text-sm text-zinc-500 mt-1">Leaderboard data will appear once streams are recorded</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podium.map((user, i) => {
              const style = RANK_STYLES[i] || RANK_STYLES[2];
              const profileId = serverUserMap[user.username.toLowerCase()];
              return (
                <div
                  key={user.username}
                  className={`bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 ring-1 ${style.ring} ${i === 0 ? "md:scale-105" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-full bg-zinc-800 border ${style.badge} flex items-center justify-center text-lg font-bold`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{style.label}</p>
                      {profileId ? (
                        <Link to={`/server-users/${profileId}`} className="text-zinc-100 font-medium truncate block hover:text-lime-400 transition-colors">
                          {user.username}
                        </Link>
                      ) : (
                        <p className="text-zinc-100 font-medium truncate">{user.username}</p>
                      )}
                    </div>
                    {i === 0 && <Crown className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div className="text-center py-2">
                    <p className="text-2xl font-bold text-lime-400">{formatVal(user.value)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{metricLabel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800/60 text-center">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{user.playCount}</p>
                      <p className="text-xs text-zinc-500">Plays</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">
                        {metric === "watchHours" ? formatBandwidth(user.bandwidthGb) : formatHours(user.watchHours)}
                      </p>
                      <p className="text-xs text-zinc-500">{metric === "watchHours" ? "Bandwidth" : "Watch"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full ranked table */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800/60 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lime-400" /> Full Ranking by {metricLabel}
              </h3>
              <span className="text-xs text-zinc-500">{ranked.length} users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800/60">
                    <th className="px-5 py-2.5 font-medium">Rank</th>
                    <th className="px-5 py-2.5 font-medium">User</th>
                    <th className="px-5 py-2.5 font-medium">{metricLabel}</th>
                    <th className="px-5 py-2.5 font-medium w-1/3">Share</th>
                    <th className="px-5 py-2.5 font-medium text-right">Plays</th>
                    <th className="px-5 py-2.5 font-medium text-right">{metric === "watchHours" ? "Bandwidth" : "Watch"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.length === 0 && podium.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 text-sm">
                        Only {podium.length} user{podium.length === 1 ? "" : "s"} ranked so far
                      </td>
                    </tr>
                  )}
                  {rest.map((user) => {
                    const profileId = serverUserMap[user.username.toLowerCase()];
                    return (
                      <tr key={user.username} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-5 py-2.5 text-zinc-500 font-mono">#{user.rank}</td>
                        <td className="px-5 py-2.5">
                          {profileId ? (
                            <Link to={`/server-users/${profileId}`} className="text-zinc-200 hover:text-lime-400 transition-colors">
                              {user.username}
                            </Link>
                          ) : (
                            <span className="text-zinc-200">{user.username}</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-lime-400 font-semibold">{formatVal(user.value)}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-lime-500/60 to-lime-400"
                                style={{ width: `${Math.max(user.pct, 2)}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-500 w-10 text-right">{user.pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-right text-zinc-400">{user.playCount}</td>
                        <td className="px-5 py-2.5 text-right text-zinc-400">
                          {metric === "watchHours" ? formatBandwidth(user.bandwidthGb) : formatHours(user.watchHours)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}