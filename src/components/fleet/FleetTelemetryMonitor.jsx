import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

function MetricCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`rounded-xl border ${bg} p-4`}>
      <div className="flex items-center gap-2 text-xs text-slate-400"><Icon className={`w-3.5 h-3.5 ${color}`} /> {label}</div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function FleetTelemetryMonitor() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const list = await base44.entities.ActiveSession.list("-created_date", 200);
      setSessions(list);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;
  }

  const directStreams = sessions.filter((s) => s.stream_mode === "direct_play" || s.stream_mode === "direct_stream").length;
  const transcodeStreams = sessions.filter((s) => s.stream_mode === "transcode").length;
  const illegal4k = sessions.filter((s) => s.stream_mode === "transcode" && (s.resolution || "").includes("4K")).length;
  const complianceRate = sessions.length > 0 ? Math.round((directStreams / sessions.length) * 100) : 100;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <MetricCard icon={CheckCircle2} label="Direct Play Streams" value={directStreams} color="text-emerald-400" bg="border-emerald-500/20 bg-emerald-500/5" />
        <MetricCard icon={Activity} label="Transcode Streams" value={transcodeStreams} color="text-amber-400" bg="border-amber-500/20 bg-amber-500/5" />
        <MetricCard icon={AlertTriangle} label="Illegal 4K Transcodes" value={illegal4k} color="text-rose-400" bg="border-rose-500/20 bg-rose-500/5" />
        <MetricCard icon={CheckCircle2} label="Direct Play Compliance" value={`${complianceRate}%`} color="text-indigo-400" bg="border-indigo-500/20 bg-indigo-500/5" />
      </div>
      {illegal4k > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <p className="text-xs text-rose-300">{illegal4k} active 4K transcode violation(s) detected across the fleet. Customer portals are displaying enforcement alerts.</p>
        </div>
      )}
    </div>
  );
}