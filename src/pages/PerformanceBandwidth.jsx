import React from "react";
import { Loader2, Wifi } from "lucide-react";
import { usePerformance } from "@/hooks/usePerformance";
import PerformanceHeader from "@/components/performance/PerformanceHeader";
import ThroughputChart from "@/components/performance/ThroughputChart";
import StreamBitrateDistribution from "@/components/performance/StreamBitrateDistribution";
import BandwidthBreakdownTables from "@/components/performance/BandwidthBreakdownTables";

export default function PerformanceBandwidth() {
  const { snapshots, devices, bandwidth, loading, refreshing, lastSync, refresh } = usePerformance();

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PerformanceHeader refreshing={refreshing} onRefresh={refresh} lastSync={lastSync} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          <Wifi className="w-4 h-4 text-lime-400" /> Throughput & Peak Bitrate
        </h2>
        <ThroughputChart snapshots={snapshots} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Stream Bitrate Distribution</h2>
        <StreamBitrateDistribution devices={devices} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">User & Media Bandwidth Breakdown</h2>
        <BandwidthBreakdownTables breakdowns={bandwidth} />
      </section>
    </div>
  );
}