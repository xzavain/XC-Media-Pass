import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Loader2 } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import {
  computeGlobalMetrics,
  bucketByHour,
  bucketByDay,
  bucketByDayOfWeek,
  bucketByHourOfDay,
} from "@/lib/statsAggregation";
import StatsMetricBar from "@/components/stats/StatsMetricBar";
import ConcurrentStreamsChart from "@/components/stats/ConcurrentStreamsChart";
import DailyVolumeChart from "@/components/stats/DailyVolumeChart";
import DayOfWeekChart from "@/components/stats/DayOfWeekChart";
import HourOfDayChart from "@/components/stats/HourOfDayChart";
import StreamLedger from "@/components/stats/StreamLedger";

export default function StatsActivity() {
  const { sessions, servers, contentItems, loading } = useStatsData();

  const metrics = useMemo(() => computeGlobalMetrics(sessions), [sessions]);
  const hourly = useMemo(() => bucketByHour(sessions, 24), [sessions]);
  const daily = useMemo(() => bucketByDay(sessions, 30), [sessions]);
  const dayOfWeek = useMemo(() => bucketByDayOfWeek(sessions), [sessions]);
  const hourOfDay = useMemo(() => bucketByHourOfDay(sessions), [sessions]);

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
            <Activity className="w-6 h-6 text-lime-400" /> Activity Analytics
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Deep-dive streaming activity, timelines, and real-time stream ledger</p>
        </div>
      </div>

      <StatsMetricBar metrics={metrics} />

      <div className="grid lg:grid-cols-2 gap-4">
        <ConcurrentStreamsChart data={hourly} />
        <DailyVolumeChart data={daily} />
        <DayOfWeekChart data={dayOfWeek} />
        <HourOfDayChart data={hourOfDay} />
      </div>

      <StreamLedger sessions={sessions} servers={servers} contentItems={contentItems} />
    </div>
  );
}