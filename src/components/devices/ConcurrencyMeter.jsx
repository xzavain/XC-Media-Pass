import React from "react";
import { RefreshCw, Radio, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function ConcurrencyMeter({ activeCount, streamLimit, autoRefresh, onToggleAutoRefresh, onForceRefresh, refreshing }) {
  const isSaturated = streamLimit > 0 && activeCount >= streamLimit;
  const pillColor = isSaturated
    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
    : activeCount > 0
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  const barWidth = streamLimit > 0 ? Math.min((activeCount / streamLimit) * 100, 100) : 0;
  const barColor = isSaturated ? "bg-rose-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${pillColor}`}>
            <Radio className={`w-3.5 h-3.5 ${isSaturated ? "animate-pulse" : ""}`} />
            Concurrent Streams: {activeCount} / {streamLimit} Active
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <Switch checked={autoRefresh} onCheckedChange={onToggleAutoRefresh} />
            Auto-refresh (5s)
          </label>
          <button
            onClick={onForceRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 rounded-lg px-3 py-1.5 border border-slate-700/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Force Refresh"}
          </button>
        </div>
      </div>

      {/* Usage bar */}
      <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Saturated warning */}
      {isSaturated && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="text-xs text-rose-300">
            ⚠️ Stream limit reached. New playback attempts will fail until an existing session is closed or killed below.
          </p>
        </div>
      )}
    </div>
  );
}