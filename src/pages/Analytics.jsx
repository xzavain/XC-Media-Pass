import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Clock, Users, Film, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "@/components/analytics/StatCard";
import SharingFlags from "@/components/analytics/SharingFlags";
import ResourceTrendChart from "@/components/analytics/ResourceTrendChart";
import LibraryIntelligencePanel from "@/components/analytics/LibraryIntelligencePanel";
import QualityBreakdownChart from "@/components/analytics/QualityBreakdownChart";
import CompatibilityMatrix from "@/components/analytics/CompatibilityMatrix";
import TranscodeHotspots from "@/components/analytics/TranscodeHotspots";
import UserLeaderboard from "@/components/analytics/UserLeaderboard";
import BandwidthTrendChart from "@/components/analytics/BandwidthTrendChart";
import { getApiForPlatform } from "@/lib/mediaServerApi";
import { logLibrarySnapshot } from "@/lib/libraryLogger";

const PIE_COLORS = ["#a3e635", "#f59e0b"];

export default function Analytics() {
  const [sessions, setSessions] = useState([]);
  const [servers, setServers] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [libraryStats, setLibraryStats] = useState({});
  const [librarySnapshots, setLibrarySnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const librarySince = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      base44.entities.PlaybackSession.list("-started_at", 500),
      base44.entities.MediaServer.list(),
      base44.entities.ResourceMetric.filter({ created_date: { $gte: since } }, "created_date", 2000),
      base44.entities.LibrarySnapshot.filter({ created_date: { $gte: librarySince } }, "created_date", 2000),
    ]).then(([sessionData, serverData, metricData, snapshotData]) => {
      setSessions(sessionData);
      setServers(serverData);
      setMetrics(metricData);
      setLibrarySnapshots(snapshotData);
      setLoading(false);

      // Fetch live counts/storage per library and log a daily snapshot for growth tracking
      const connected = serverData.filter((s) => s.status === "connected" && (s.libraries || []).length > 0);
      Promise.allSettled(
        connected.flatMap((server) =>
          server.libraries.map(async (library) => {
            const api = getApiForPlatform(server.platform);
            const stats = await api.getLibraryStats(server.url, server.api_key, library.id);
            logLibrarySnapshot(server, library, stats).catch(() => {});
            return { key: `${server.id}:${library.id}`, stats };
          })
        )
      ).then((results) => {
        const map = {};
        results.forEach((r) => {
          if (r.status === "fulfilled") map[r.value.key] = r.value.stats;
        });
        setLibraryStats(map);
      });
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
      </div>
    );
  }

  const totalWatchHours = sessions.reduce((sum, s) => {
    if (!s.started_at || !s.ended_at) return sum;
    return sum + (new Date(s.ended_at) - new Date(s.started_at)) / 3600000;
  }, 0);

  const userCounts = {};
  for (const s of sessions) userCounts[s.username] = (userCounts[s.username] || 0) + 1;
  const topUsers = Object.entries(userCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const directCount = sessions.filter((s) => s.transcode_decision === "direct play").length;
  const transcodeCount = sessions.filter((s) => s.transcode_decision === "transcode").length;
  const pieData = [
    { name: "Direct Play", value: directCount },
    { name: "Transcode", value: transcodeCount },
  ];

  const uniqueUsers = new Set(sessions.map((s) => s.username)).size;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-lime-400" /> Watch Analytics
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Insights from recorded playback history</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Film} label="Total Sessions" value={sessions.length} />
        <StatCard icon={Clock} label="Watch Hours" value={totalWatchHours.toFixed(1)} />
        <StatCard icon={Users} label="Unique Users" value={uniqueUsers} />
      </div>

      {sessions.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-300 font-medium">No history yet</h3>
          <p className="text-sm text-zinc-500 mt-1">Keep the Live Sessions page open to start building watch history</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Top Users</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topUsers}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#a3e635" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Direct Play vs Transcode</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Sharing Detection</h3>
        <SharingFlags sessions={sessions} />
      </div>

      {servers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Server Resource Trends (Last 24h)</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            {servers.map((server) => (
              <ResourceTrendChart key={server.id} server={server} metrics={metrics} />
            ))}
          </div>
        </div>
      )}

      <LibraryIntelligencePanel servers={servers} statsMap={libraryStats} snapshots={librarySnapshots} />

      <div>
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Performance Deep-Dive</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <QualityBreakdownChart sessions={sessions} />
          <BandwidthTrendChart sessions={sessions} />
          <CompatibilityMatrix sessions={sessions} />
          <TranscodeHotspots sessions={sessions} />
          <UserLeaderboard sessions={sessions} />
        </div>
      </div>
    </div>
  );
}