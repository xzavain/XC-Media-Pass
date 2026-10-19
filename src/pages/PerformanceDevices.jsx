import React from "react";
import { Loader2, Monitor } from "lucide-react";
import { usePerformance } from "@/hooks/usePerformance";
import PerformanceHeader from "@/components/performance/PerformanceHeader";
import ClientDistributionGrid from "@/components/performance/ClientDistributionGrid";
import DeviceTelemetryTable from "@/components/performance/DeviceTelemetryTable";

export default function PerformanceDevices() {
  const { devices, servers, loading, refreshing, lastSync, refresh } = usePerformance();

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-lime-500 animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PerformanceHeader refreshing={refreshing} onRefresh={refresh} lastSync={lastSync} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          <Monitor className="w-4 h-4 text-lime-400" /> Client Distribution
        </h2>
        <ClientDistributionGrid devices={devices} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Device Telemetry</h2>
        <DeviceTelemetryTable devices={devices} servers={servers} />
      </section>
    </div>
  );
}