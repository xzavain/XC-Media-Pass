import React, { useEffect } from "react";
import { Clock, Gauge, Wifi, Users, Activity, Loader2 } from "lucide-react";
import { usePerformance } from "@/hooks/usePerformance";
import { syncPerformance } from "@/lib/performanceSync";
import PerformanceHeader from "@/components/performance/PerformanceHeader";
import MetricCard from "@/components/performance/MetricCard";
import ConcurrentStreamsChart from "@/components/performance/ConcurrentStreamsChart";
import ResourceGauges from "@/components/performance/ResourceGauges";
import CodecBreakdownChart from "@/components/performance/CodecBreakdownChart";
import ResolutionMixChart from "@/components/performance/ResolutionMixChart";

function fmtWatchTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtBandwidth(kb) {
  if (kb < 1024) return `${Math.round(kb)} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

export default function Performance() {
  const { snapshots, servers, watchSeconds, loading, refreshing, lastSync, refresh, reload } = usePerformance();

  // Trigger a throttled sync on first visit (writes only if last snapshot > 6h old)
  useEffect(() => {
    syncPerformance({ force: false }).then(() => reload()).catch(() => {});
  }, [reload]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>;
  }

  const totalBw = snapshots.reduce((s, x) => s + (x.total_bandwidth_kb || 0), 0);
  const avgBitrate = snapshots.length ? Math.round(snapshots.reduce((s, x) => s + (x.peak_bitrate || 0), 0) / snapshots.length) : 0;
  const activeUsers = snapshots.length ? Math.max(...snapshots.map((s) => s.active_users || 0)) : 0;
  const direct = snapshots.reduce((s, x) => s + (x.direct_play_count || 0), 0);
  const transcode = snapshots.reduce((s, x) => s + (x.transcode_count || 0), 0);
  const directPct = direct + transcode ? Math.round((direct / (direct + transcode)) * 100) : 0;
  const latest = snapshots[0];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PerformanceHeader refreshing={refreshing} onRefresh={refresh} lastSync={lastSync} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={Clock} label="Watch Time" value={fmtWatchTime(watchSeconds)} accent="text-lime-400" />
        <MetricCard icon={Gauge} label="Avg Bitrate" value={`${avgBitrate} kbps`} accent="text-sky-400" />
        <MetricCard icon={Wifi} label="Total Bandwidth" value={fmtBandwidth(totalBw)} accent="text-violet-400" />
        <MetricCard icon={Users} label="Peak Active Users" value={activeUsers} accent="text-amber-400" />
        <MetricCard icon={Activity} label="Direct / Transcode" value={`${directPct}% / ${100 - directPct}%`} accent="text-lime-400" />
      </div>

      <ConcurrentStreamsChart snapshots={snapshots} />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ResourceGauges snapshot={latest} />
        </div>
        <div className="lg:col-span-1">
          <CodecBreakdownChart snapshots={snapshots} />
        </div>
        <div className="lg:col-span-1">
          <ResolutionMixChart snapshots={snapshots} />
        </div>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Snapshots auto-sync every 6 hours while the dashboard is open. A server-side cron (runs without an active admin) requires a Builder+ upgrade.
      </p>
    </div>
  );
}