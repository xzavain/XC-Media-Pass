import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Activity, Clock3, Server, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import NowPlayingPanel from "@/components/dashboard/NowPlayingPanel";
import ServerResourcesPanel from "@/components/dashboard/ServerResourcesPanel";
import ServerStatusSummary from "@/components/dashboard/ServerStatusSummary";
import RevenueTrendChart from "@/components/dashboard/RevenueTrendChart";
import SessionActivityChart from "@/components/dashboard/SessionActivityChart";
import SessionsMap from "@/components/sessions/SessionsMap";
import PlatformBadge from "@/components/shared/PlatformBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import { getActiveSessions } from "@/lib/sessionsApi";
import { logSessions } from "@/lib/sessionLogger";
import { logResourceSnapshot } from "@/lib/resourceLogger";
import { syncPerformance } from "@/lib/performanceSync";
import moment from "moment";

export default function Dashboard() {
  const [servers, setServers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [todaySessionCount, setTodaySessionCount] = useState(0);
  const [todayWatchHours, setTodayWatchHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const pollSessions = useCallback(async (serverList) => {
    const results = await Promise.allSettled(
      serverList.map(async (server) => {
        const active = await getActiveSessions(server);
        logSessions(server, active).catch(() => {});
        logResourceSnapshot(server, active.length).catch(() => {});
        return active;
      })
    );
    setSessions(results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value));
    // Throttled performance snapshot sync (writes at most every 6h per server)
    syncPerformance({ force: false }).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [s, i, l, todayHistory] = await Promise.all([
        base44.entities.MediaServer.list(),
        base44.entities.Invitation.list("-created_date", 50),
        base44.entities.ActivityLog.list("-created_date", 10),
        base44.entities.PlaybackSession.filter({ started_at: { $gte: moment().startOf("day").toISOString() } }),
      ]);
      setServers(s);
      setInvitations(i);
      setLogs(l);
      setTodaySessionCount(todayHistory.length);
      const hours = todayHistory.reduce((sum, sess) => {
        if (!sess.ended_at) return sum;
        return sum + (new Date(sess.ended_at) - new Date(sess.started_at)) / 3600000;
      }, 0);
      setTodayWatchHours(hours);

      const valid = s.filter((srv) => srv.url && srv.api_key);
      pollSessions(valid);
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => pollSessions(valid), 10000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pollSessions]);

  useEffect(() => {
    loadData();
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  // Check and update expired invitations
  useEffect(() => {
    const checkExpired = async () => {
      const now = new Date();
      const expired = invitations.filter(
        inv => inv.status === "active" && new Date(inv.expires_at) < now
      );
      for (const inv of expired) {
        try {
          await base44.entities.Invitation.update(inv.id, { status: "expired" });
          await base44.entities.ActivityLog.create({
            action: "trial_expired",
            invitation_id: inv.id,
            server_id: inv.server_id,
            username: inv.username || inv.email,
            platform: inv.platform,
            details: `Trial expired for ${inv.username || inv.email}`,
          });
        } catch {}
      }
      if (expired.length) loadData();
    };
    if (invitations.length) checkExpired();
  }, [invitations.length]);

  const serversById = Object.fromEntries(servers.map((s) => [s.id, s]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-lime-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time overview of your media servers</p>
        </div>
        <Link to="/create-invite">
          <Button className="bg-lime-600 hover:bg-lime-700 text-white gap-2">
            <Plus className="w-4 h-4" /> New Invite
          </Button>
        </Link>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Activity} label="Active Streams" value={sessions.length} color="violet" />
        <StatsCard icon={Clock3} label="Sessions Today" value={todaySessionCount} color="blue" />
        <StatsCard icon={Clock3} label="Watch Hours Today" value={todayWatchHours.toFixed(1)} color="emerald" />
        <StatsCard icon={Server} label="Servers Connected" value={servers.length} color="amber" />
      </div>

      {/* Server Status Summary */}
      <ServerStatusSummary servers={servers} />

      {/* Now Playing */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Now Playing</h2>
        <NowPlayingPanel sessions={sessions} serversById={serversById} onKilled={() => pollSessions(servers)} />
      </div>

      {/* Stream Map */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Stream Map</h2>
        <SessionsMap sessions={sessions} />
      </div>

      {/* Server Resources */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
        <div className="px-5 py-4 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-200">Server Resources</h2>
        </div>
        <ServerResourcesPanel servers={servers} sessions={sessions} />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueTrendChart />
        <SessionActivityChart sessions={sessions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trials */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Recent Trials</h2>
            <Link to="/trials" className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {invitations.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">
                    {inv.username || inv.email || "Unclaimed"}
                  </p>
                  <p className="text-xs text-zinc-500">{inv.server_name}</p>
                </div>
                <PlatformBadge platform={inv.platform} />
                <StatusBadge status={inv.status} />
                <span className="text-xs text-zinc-500 hidden sm:block">
                  {moment(inv.expires_at).fromNow()}
                </span>
              </div>
            ))}
            {!invitations.length && (
              <div className="px-5 py-8 text-center text-zinc-500 text-sm">
                No invitations yet. Create your first invite to get started.
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
          <div className="px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Activity</h2>
          </div>
          <div className="p-2">
            <RecentActivity logs={logs} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}