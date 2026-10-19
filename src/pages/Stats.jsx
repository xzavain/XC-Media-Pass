import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Activity, Users, ArrowRight, Loader2, Film, TrendingUp, Trophy } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import { computeGlobalMetrics, computeUserStats, computePlatformStats, computeCodecStats } from "@/lib/statsAggregation";
import StatsMetricBar from "@/components/stats/StatsMetricBar";
import PlatformBadge from "@/components/shared/PlatformBadge";
import CodecBadge from "@/components/stats/CodecBadge";

export default function Stats() {
  const { sessions, servers, loading } = useStatsData();

  const metrics = useMemo(() => computeGlobalMetrics(sessions), [sessions]);
  const topUsers = useMemo(() => computeUserStats(sessions).slice(0, 5), [sessions]);
  const platformStats = useMemo(() => computePlatformStats(sessions), [sessions]);
  const codecStats = useMemo(() => computeCodecStats(sessions).slice(0, 5), [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
      </div>
    );
  }

  const subPages = [
    { to: "/stats/activity", icon: Activity, label: "Activity", desc: "Stream ledger, timelines & trends" },
    { to: "/stats/users", icon: Users, label: "Users", desc: "Engagement leaderboards & profiles" },
    { to: "/stats/leaderboard", icon: Trophy, label: "Leaderboard", desc: "Rank users by stream time & bandwidth" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-lime-400" /> Stats Center
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Platform-wide streaming telemetry and user engagement analytics</p>
        </div>
        <div className="flex gap-2">
          {subPages.map((sp) => (
            <Link
              key={sp.to}
              to={sp.to}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-sm text-zinc-200 hover:border-lime-500/30 hover:text-lime-400 transition-colors"
            >
              <sp.icon className="w-4 h-4" /> {sp.label} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      </div>

      <StatsMetricBar metrics={metrics} />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-lime-400" /> Top Users by Watch Time
          </h3>
          {topUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No user data yet</p>
          ) : (
            <div className="space-y-2">
              {topUsers.map((u, i) => (
                <div key={u.username} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-zinc-600">#{i + 1}</span>
                    <span className="text-zinc-200">{u.username}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400">
                    <span>{u.playCount} plays</span>
                    <span className="text-lime-400 font-medium">{u.watchHours.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Film className="w-4 h-4 text-lime-400" /> Platform & Codec Distribution
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-2">By Platform</p>
              <div className="flex flex-wrap gap-2">
                {platformStats.map((p) => (
                  <div key={p.platform} className="flex items-center gap-2">
                    <PlatformBadge platform={p.platform} />
                    <span className="text-sm text-zinc-300">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-2">Top Codecs</p>
              <div className="flex flex-wrap gap-2">
                {codecStats.map((c) => (
                  <div key={c.codec} className="flex items-center gap-2">
                    <CodecBadge codec={c.codec} />
                    <span className="text-sm text-zinc-300">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {subPages.map((sp) => (
          <Link
            key={sp.to}
            to={sp.to}
            className="group bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 hover:border-lime-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
                <sp.icon className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <p className="text-zinc-100 font-medium flex items-center gap-1">
                  {sp.label} <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-sm text-zinc-500">{sp.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}