import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowLeft, Loader2 } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import { computeGlobalMetrics, computeUserStats } from "@/lib/statsAggregation";
import StatsMetricBar from "@/components/stats/StatsMetricBar";
import UserPodium from "@/components/stats/UserPodium";
import UserEngagementList from "@/components/stats/UserEngagementList";

export default function StatsUsers() {
  const { sessions, serverUsers, loading } = useStatsData();

  const metrics = useMemo(() => computeGlobalMetrics(sessions), [sessions]);
  const allUsers = useMemo(() => computeUserStats(sessions), [sessions]);
  const podium = allUsers.slice(0, 3);
  const runnersUp = allUsers.slice(3);

  // Map usernames to ServerUser entity IDs for admin profile linking
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/stats" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2">
            <ArrowLeft className="w-3 h-3" /> Stats Center
          </Link>
          <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-lime-400" /> User Analytics
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Engagement leaderboards, per-user profile metrics, and admin management</p>
        </div>
      </div>

      <StatsMetricBar metrics={metrics} />

      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Top 3 by Watch Time</h2>
        <UserPodium users={podium} />
      </div>

      {runnersUp.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Runners Up</h2>
          <UserEngagementList users={runnersUp} serverUserMap={serverUserMap} />
        </div>
      )}

      {allUsers.length === 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-300 font-medium">No user activity yet</h3>
          <p className="text-sm text-zinc-500 mt-1">User engagement data will appear once streams are recorded</p>
        </div>
      )}
    </div>
  );
}